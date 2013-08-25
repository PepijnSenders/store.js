/**
 * @class Store
 *
 * @3rdparty:  Base64 encode / decode from http://www.webtoolkit.info/
 */
define(function(require) {

	var JSON = require('json');

	var Store = {

		_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

		// public method for encoding
		encode : function (input) {
			var output = "";
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;

			input = Store._utf8_encode(input);

			while (i < input.length) {

				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}

				output = output +
					this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
					this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

			}

			return output;
		},

		// public method for decoding
		decode : function (input) {
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;

			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			while (i < input.length) {

				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}

			}

			output = Store._utf8_decode(output);

			return output;

		},

		// private method for UTF-8 encoding
		_utf8_encode : function (string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";

			for (var n = 0; n < string.length; n++) {

				var c = string.charCodeAt(n);

				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}

			}

			return utftext;
		},

		// private method for UTF-8 decoding
		_utf8_decode : function (utftext) {
			var string = "";
			var i = 0;
			var c = 0, c1 = 0, c2 = 0;

			while ( i < utftext.length ) {

				c = utftext.charCodeAt(i);

				if (c < 128) {
					string += String.fromCharCode(c);
					i++;
				}
				else if((c > 191) && (c < 224)) {
					c2 = utftext.charCodeAt(i+1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}
				else {
					c2 = utftext.charCodeAt(i+1);
					c3 = utftext.charCodeAt(i+2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}
			}

			return string;
		},

		// sets eninge to use
		setEngine: function(engine) {

			if (engine) {
				this.engine = engine;

			} else {

				this.engine = 'Cookie';
				if ('localStorage' in window && window.localStorage !== null) {
					this.engine = 'LocalStorage';
				} else {
					try {
						if (document.getElementById('oPersistInput') && document.getElementById('oPersistInput').addBehavior) {
							this.engine = 'UserData';
						}
					} catch(e) {}
				}
			}
		},

		contentEncode: function(value, expires) {
			var obj = { value: value };
			if (typeof expires !== 'undefined') {
				var date = new Date();
				obj.expire = date.setTime(date.getTime() + (expires*60*60*1000));
			}
			return Store.encode(JSON.stringify(obj));
		},

		contentDecode: function(b64str) {
			var obj =  JSON.parse(Store.decode(b64str));
			var date = new Date();
			if (obj.expire && obj.expire < date.getTime()) {
				this.del(name);
				return null;
			}
			return obj.value;
		},

		// set/get based on engine
		set: function(name, value, hours) {
			this['_set' + this.engine](name, value, hours);
		},

		get: function(name) {
			return this['_get' + this.engine](name);
		},

		del: function(name) {
			this['_del' + this.engine](name);
		},

		// Persistent storage with cookies
		_getCookie: function(name) {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			for(var i=0;i < ca.length;i++) {
				var c = ca[i];
				while (c.charAt(0) === ' ') c = c.substring(1, c.length);
				if (c.indexOf(nameEQ) === 0) return this.contentDecode(c.substring(nameEQ.length, c.length));
			}
			return null;
		},

		_setCookie: function(name, value, hours) {
			var expires = "";
			if (hours) {
				var date = new Date();
				date.setTime(date.getTime() + (hours*60*60*1000));
				expires = "; expires=" + date.toGMTString();
			}
			document.cookie = name + "=" + this.contentEncode(value) + expires + "; path=/";
		},

		_delCookie: function(name) {
			this.set(name, "", -1);
		},

		// Persistent storage with IE's userData
		// need this in index.html:
		// head: <style type="text/css"> .storeuserData { behavior: url(#default#userData); } </style>
		// body: <form id="oPersistForm" style="display: none;"><input class="storeuserData" type="hidden" id="oPersistInput"></form>
		_getUserData: function(name) {
			var oPersist = oPersistForm.oPersistInput;
			oPersist.load(name);
			var value = oPersist.getAttribute("persist");
			if (!value) return null;
			return this.contentDecode(value);
		},

		_setUserData: function(name, value, hours) {
			var oPersist=oPersistForm.oPersistInput;
			oPersist.setAttribute("persist", this.contentEncode(value, hours));
			oPersist.save(name);
		},

		_delUserData: function(name) {
			var oPersist=oPersistForm.oPersistInput;
			oPersist.removeAttribute("persist");
			oPersist.save(name);
		},

		// Persistent storage with HTML5 localStorage
		_getLocalStorage: function(name) {
			var item = localStorage.getItem(name);
			if (!item) return null;
			return this.contentDecode(item);
		},

		_setLocalStorage: function(name, value, hours) {
			localStorage.setItem(name, this.contentEncode(value, hours));
		},

		_delLocalStorage: function(name) {
			localStorage.removeItem(name);
		}
	};

	Store.setEngine();

	return Store;
});