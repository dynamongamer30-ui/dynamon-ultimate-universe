globalThis.__nitro_main__ = import.meta.url;
import { a as FastResponse, n as HTTPError, r as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/_redirects": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"1f-tHWwJwH1KU0Iba9hFo8Jor2vet0\"",
		"mtime": "2026-07-04T07:10:32.036Z",
		"size": 31,
		"path": "../public/_redirects"
	},
	"/apple-icon.png": {
		"type": "image/png",
		"etag": "\"a42-o953JxvIavDjStfvW8JRF7vWLk4\"",
		"mtime": "2026-07-04T07:10:32.036Z",
		"size": 2626,
		"path": "../public/apple-icon.png"
	},
	"/icon-dark-32x32.png": {
		"type": "image/png",
		"etag": "\"249-Eje7mf5IYnUOzvWahZHzVZgkxwI\"",
		"mtime": "2026-07-04T07:10:32.036Z",
		"size": 585,
		"path": "../public/icon-dark-32x32.png"
	},
	"/icon-light-32x32.png": {
		"type": "image/png",
		"etag": "\"236-1LCyzDLVe8SSrsZvG9eS1rhTvHw\"",
		"mtime": "2026-07-04T07:10:32.036Z",
		"size": 566,
		"path": "../public/icon-light-32x32.png"
	},
	"/icon.svg": {
		"type": "image/svg+xml",
		"etag": "\"518-9M+7JU4r6V/KOpL+LPj+dv/tp9E\"",
		"mtime": "2026-07-04T07:10:32.040Z",
		"size": 1304,
		"path": "../public/icon.svg"
	},
	"/manifest.webmanifest": {
		"type": "application/manifest+json",
		"etag": "\"157-TPFCXHk3vSSisMiSAj6EYBQcp4Q\"",
		"mtime": "2026-07-04T07:10:32.044Z",
		"size": 343,
		"path": "../public/manifest.webmanifest"
	},
	"/placeholder-logo.png": {
		"type": "image/png",
		"etag": "\"238-pS23KseK6wWmMHqaT+IrH57MhUI\"",
		"mtime": "2026-07-04T07:10:32.044Z",
		"size": 568,
		"path": "../public/placeholder-logo.png"
	},
	"/placeholder-logo.svg": {
		"type": "image/svg+xml",
		"etag": "\"c88-Vv8IA2xgjEZAiN2dErxBClzvxAM\"",
		"mtime": "2026-07-04T07:10:32.044Z",
		"size": 3208,
		"path": "../public/placeholder-logo.svg"
	},
	"/placeholder.jpg": {
		"type": "image/jpeg",
		"etag": "\"428-IKS5JfbV4RoTBDDc/wuWqgR2Qhw\"",
		"mtime": "2026-07-04T07:10:32.044Z",
		"size": 1064,
		"path": "../public/placeholder.jpg"
	},
	"/placeholder-user.jpg": {
		"type": "image/jpeg",
		"etag": "\"663-C3c0t/BkPcGmoKQMFVHBP6o+6fQ\"",
		"mtime": "2026-07-04T07:10:32.044Z",
		"size": 1635,
		"path": "../public/placeholder-user.jpg"
	},
	"/assets/AvatarPicker-D46KEvrL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"886-bRYzqz4bXPCswMsufnj6CxeFxGk\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 2182,
		"path": "../public/assets/AvatarPicker-D46KEvrL.js"
	},
	"/placeholder.svg": {
		"type": "image/svg+xml",
		"etag": "\"cb5-3cfZ/x0uNhX4kurZGAkOBE4K/G0\"",
		"mtime": "2026-07-04T07:10:32.048Z",
		"size": 3253,
		"path": "../public/placeholder.svg"
	},
	"/assets/FavoriteButton-Bh2dui28.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"645-j4pws3J8rdiA5VCrdini0J3XmvE\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 1605,
		"path": "../public/assets/FavoriteButton-Bh2dui28.js"
	},
	"/assets/ModCard-C7yr6oyt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1cec-CtuEAvAcNuhWhv9A+0znVneOEqg\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 7404,
		"path": "../public/assets/ModCard-C7yr6oyt.js"
	},
	"/assets/OwnerGate-pt3mP91F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fdc-c0mx/abMO7EzOi1+Q2NFNjH0Ivk\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 4060,
		"path": "../public/assets/OwnerGate-pt3mP91F.js"
	},
	"/assets/PageShell-z40SruK_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68c2-K+Oez+SHKKeZpDaXPtVpeflsU6g\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 26818,
		"path": "../public/assets/PageShell-z40SruK_.js"
	},
	"/assets/UnlockKeyButton-BRbOgAHR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c3-qHiLzylNApsw5Rp7YGRyRF8lBkQ\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 707,
		"path": "../public/assets/UnlockKeyButton-BRbOgAHR.js"
	},
	"/assets/ab1-Cmi5VDs_.jpg": {
		"type": "image/jpeg",
		"etag": "\"9a27-NblW8plrI6cHiyUR4n7/j5fqpxQ\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 39463,
		"path": "../public/assets/ab1-Cmi5VDs_.jpg"
	},
	"/assets/ab2-vwS5e1Jl.jpg": {
		"type": "image/jpeg",
		"etag": "\"a4c7-XoCKfjGLP0jtZlTJQvzwiVoXdEA\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 42183,
		"path": "../public/assets/ab2-vwS5e1Jl.jpg"
	},
	"/assets/ab10-Cd3rwTMo.jpg": {
		"type": "image/jpeg",
		"etag": "\"cb8b-wma6O0EC+GbO09+OKVEpfgnpYZU\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 52107,
		"path": "../public/assets/ab10-Cd3rwTMo.jpg"
	},
	"/assets/ab3-BUjMZ8gx.jpg": {
		"type": "image/jpeg",
		"etag": "\"d4e9-FgexWaCYm2iPNrQEa2maZH9oY5A\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 54505,
		"path": "../public/assets/ab3-BUjMZ8gx.jpg"
	},
	"/assets/ab4-t8WZNk4U.jpg": {
		"type": "image/jpeg",
		"etag": "\"bb31-eFRvKNKosAQYIfCe6vpcFbwRLu0\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 47921,
		"path": "../public/assets/ab4-t8WZNk4U.jpg"
	},
	"/assets/ab5-m9jRJ6VJ.jpg": {
		"type": "image/jpeg",
		"etag": "\"6d7d-G+XfbRDWA1fdzcltC8OnnAcxp6c\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 28029,
		"path": "../public/assets/ab5-m9jRJ6VJ.jpg"
	},
	"/assets/ab6-BschmfIr.jpg": {
		"type": "image/jpeg",
		"etag": "\"c3ed-mVxDU72pspRXXiAzB3xDFWM7FBI\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 50157,
		"path": "../public/assets/ab6-BschmfIr.jpg"
	},
	"/assets/ab7-d9x8wsN7.jpg": {
		"type": "image/jpeg",
		"etag": "\"c92a-jY8AWvoMy6S5bHGNSbVOOYE0HPo\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 51498,
		"path": "../public/assets/ab7-d9x8wsN7.jpg"
	},
	"/assets/ab8-CIugN9mD.jpg": {
		"type": "image/jpeg",
		"etag": "\"dffd-1CduPRorV2DILuFiWr7wp1UTQ/Y\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 57341,
		"path": "../public/assets/ab8-CIugN9mD.jpg"
	},
	"/assets/ab9-BEQFe-X0.jpg": {
		"type": "image/jpeg",
		"etag": "\"ad34-CFCMaHlsZt2ppXmQiRFheA5IG/Q\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 44340,
		"path": "../public/assets/ab9-BEQFe-X0.jpg"
	},
	"/assets/about-tDCIXvV2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"952-cskCTi2iv7tXFHAHyfJMTPIrfeI\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 2386,
		"path": "../public/assets/about-tDCIXvV2.js"
	},
	"/assets/achievements-CrNZ-pgM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cc2-zDXyL6AoiMlah7HG4j/k+/Lm9dU\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 3266,
		"path": "../public/assets/achievements-CrNZ-pgM.js"
	},
	"/assets/admin-CpcRc-cy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dca-AepL90pcGThZVTaWhdOETrHaZK0\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 7626,
		"path": "../public/assets/admin-CpcRc-cy.js"
	},
	"/assets/admin-control-DDxpjTal.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"44f3-/lyfBMvDW8ZmLi1fvzBig0z0Mxc\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 17651,
		"path": "../public/assets/admin-control-DDxpjTal.js"
	},
	"/assets/admin-keys-B47oErgz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"43e3-jfEljp5NVRDL3v9FSGjXHjBlUN0\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 17379,
		"path": "../public/assets/admin-keys-B47oErgz.js"
	},
	"/assets/admin-loader-D6XN1VcB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3423-WyFbYERtEQfviIh9ai6ruUNEPU0\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 13347,
		"path": "../public/assets/admin-loader-D6XN1VcB.js"
	},
	"/assets/ag1-DG7pnv8N.jpg": {
		"type": "image/jpeg",
		"etag": "\"acdf-oqTeQBtZzfKKSOz1AUZDw067y6g\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 44255,
		"path": "../public/assets/ag1-DG7pnv8N.jpg"
	},
	"/assets/ag10-CGj3nepX.jpg": {
		"type": "image/jpeg",
		"etag": "\"a643-QkuQ8gKxIwkVtt/kLGiTaiM8grk\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 42563,
		"path": "../public/assets/ag10-CGj3nepX.jpg"
	},
	"/assets/ag2-DgdO5Ji5.jpg": {
		"type": "image/jpeg",
		"etag": "\"ce72-lYnx4F8If9BBFKrbEVrjG8gPZsU\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 52850,
		"path": "../public/assets/ag2-DgdO5Ji5.jpg"
	},
	"/assets/ag3-BgFcks7_.jpg": {
		"type": "image/jpeg",
		"etag": "\"d780-6Hv3dTMs02XYCqBAA4U8lh9QyCI\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 55168,
		"path": "../public/assets/ag3-BgFcks7_.jpg"
	},
	"/assets/ag4-Bkuv1ozq.jpg": {
		"type": "image/jpeg",
		"etag": "\"c6aa-M6TTesYtP0DI81iueopygikGs3M\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 50858,
		"path": "../public/assets/ag4-Bkuv1ozq.jpg"
	},
	"/assets/ag5-BEjQuSHh.jpg": {
		"type": "image/jpeg",
		"etag": "\"7c1a-WsmXL0RBh+Azs7x+2MkADUjfUvk\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 31770,
		"path": "../public/assets/ag5-BEjQuSHh.jpg"
	},
	"/assets/ag6-B-rxUP3j.jpg": {
		"type": "image/jpeg",
		"etag": "\"af02-kq9hvjGxHcIE+4NYVEE9XHNtohQ\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 44802,
		"path": "../public/assets/ag6-B-rxUP3j.jpg"
	},
	"/assets/ag7-BOCfeG_8.jpg": {
		"type": "image/jpeg",
		"etag": "\"d6dc-q83Hv+CUtcjau8CdQTRh7HXAgWM\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 55004,
		"path": "../public/assets/ag7-BOCfeG_8.jpg"
	},
	"/assets/ag8-DRNCDjlP.jpg": {
		"type": "image/jpeg",
		"etag": "\"b69d-kyFEUwtbzgEeFdpc4kF3rRhNBaY\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 46749,
		"path": "../public/assets/ag8-DRNCDjlP.jpg"
	},
	"/assets/ag9-B07S76bf.jpg": {
		"type": "image/jpeg",
		"etag": "\"b9c4-KyOgEp1gNPjVxQD34EcMGEKdIAQ\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 47556,
		"path": "../public/assets/ag9-B07S76bf.jpg"
	},
	"/assets/arrow-right-CoSsop1e.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a5-hcg53R7sPQ3L/tVVK2qhxCxxopo\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 165,
		"path": "../public/assets/arrow-right-CoSsop1e.js"
	},
	"/assets/auth-O3r9qJmC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"323a-g8dg/CKMDCHVVrfZqMSJQS0ryMU\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 12858,
		"path": "../public/assets/auth-O3r9qJmC.js"
	},
	"/assets/button-DhX0yFuZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7bbc-O7GevF3IL01FA4LV9csK1R2rx5c\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 31676,
		"path": "../public/assets/button-DhX0yFuZ.js"
	},
	"/assets/check-DQ-KjWGf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7c-V33vqe9zfywoEVWOrM+xOmrQy+I\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 124,
		"path": "../public/assets/check-DQ-KjWGf.js"
	},
	"/assets/clock-DrfrntI7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a9-UOtle7Ne6Q1cfM3v5s23RA1IP8s\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 169,
		"path": "../public/assets/clock-DrfrntI7.js"
	},
	"/assets/contact-FyutaKNN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b71-++gPSGpUUB/BWToBIXLA7PCCvjw\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 2929,
		"path": "../public/assets/contact-FyutaKNN.js"
	},
	"/assets/copy-Ca6_uD36.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ec-MXCyJyKrUW07jLpYUA17JB3ABjs\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 236,
		"path": "../public/assets/copy-Ca6_uD36.js"
	},
	"/assets/createLucideIcon-D8RmYTQo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3429b-WNkL7sSvKygWEmePM7rkh/MxHXs\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 213659,
		"path": "../public/assets/createLucideIcon-D8RmYTQo.js"
	},
	"/assets/dgData-E46Jebld.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fad-V58MuMsSvOb4wbLoQDfMCxa8YOA\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 4013,
		"path": "../public/assets/dgData-E46Jebld.js"
	},
	"/assets/dgWorker-B6D7aTFb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"81b-EVQssvniPYko2IlecaBTkLOALAI\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 2075,
		"path": "../public/assets/dgWorker-B6D7aTFb.js"
	},
	"/assets/disclaimer-Ct4gM-By.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a2a-i6zQCAYH8lKABeSnvUkxUNtvMoM\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 2602,
		"path": "../public/assets/disclaimer-Ct4gM-By.js"
	},
	"/assets/f1-fk6WMsZp.jpg": {
		"type": "image/jpeg",
		"etag": "\"b64f-Tk/2PJbZXIzahMID2DH4uDQBcho\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 46671,
		"path": "../public/assets/f1-fk6WMsZp.jpg"
	},
	"/assets/f10-BEc29XMy.jpg": {
		"type": "image/jpeg",
		"etag": "\"8a16-TIZj1MFluQG7NIOgnS8iUq7geW0\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 35350,
		"path": "../public/assets/f10-BEc29XMy.jpg"
	},
	"/assets/f2-QOEpM3oR.jpg": {
		"type": "image/jpeg",
		"etag": "\"c53e-54uNYXuVomG8jiwgfBjMKua7FyU\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 50494,
		"path": "../public/assets/f2-QOEpM3oR.jpg"
	},
	"/assets/f3-B9on5--K.jpg": {
		"type": "image/jpeg",
		"etag": "\"a536-yQy4uWAeJ+U5b+twK0gqP4RwxB0\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 42294,
		"path": "../public/assets/f3-B9on5--K.jpg"
	},
	"/assets/f4-DbuPAYhh.jpg": {
		"type": "image/jpeg",
		"etag": "\"9f5f-HN2JRlOdmBdAIH1lmM5IVCIDAPU\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 40799,
		"path": "../public/assets/f4-DbuPAYhh.jpg"
	},
	"/assets/f5-2HLb1NHe.jpg": {
		"type": "image/jpeg",
		"etag": "\"6480-1FdNZzlmHKcQ0eM+bdc2wZ4dNVU\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 25728,
		"path": "../public/assets/f5-2HLb1NHe.jpg"
	},
	"/assets/f6-BAPc7U_2.jpg": {
		"type": "image/jpeg",
		"etag": "\"c5c4-rcDBgDnyaPjj+xNLk28LPDQDEs8\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 50628,
		"path": "../public/assets/f6-BAPc7U_2.jpg"
	},
	"/assets/f7-BepwRB9A.jpg": {
		"type": "image/jpeg",
		"etag": "\"89ae-TjvqSa33Bm6aRb8l/bWp6N0M7rM\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 35246,
		"path": "../public/assets/f7-BepwRB9A.jpg"
	},
	"/assets/f8-CuEmv_vG.jpg": {
		"type": "image/jpeg",
		"etag": "\"9073-gPOlIDJ4YtQomWstVd0pQcY7tZA\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 36979,
		"path": "../public/assets/f8-CuEmv_vG.jpg"
	},
	"/assets/f9-DajBqzpb.jpg": {
		"type": "image/jpeg",
		"etag": "\"c0cd-usb/u+hUKgtEjB7Ex4n6ClNjdoM\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 49357,
		"path": "../public/assets/f9-DajBqzpb.jpg"
	},
	"/assets/favorites-CHAB8tps.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"75f-TsLrEs3VjzxUYY3L5NZ1ovwfnPk\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 1887,
		"path": "../public/assets/favorites-CHAB8tps.js"
	},
	"/assets/fingerprint-CfYfLZAu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8588-0StAfdrVTVNyo+tIm7Vq7U0zQyA\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 34184,
		"path": "../public/assets/fingerprint-CfYfLZAu.js"
	},
	"/assets/dark-DTEWBl3B.jpg": {
		"type": "image/jpeg",
		"etag": "\"3bf65-a+JGia/SKL5Nxw9SG2blyhoAeOs\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 245605,
		"path": "../public/assets/dark-DTEWBl3B.jpg"
	},
	"/assets/generator-BwSL4Zif.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2226-2spy0x0oGp4PCcSsaCR75ZzMFOk\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 8742,
		"path": "../public/assets/generator-BwSL4Zif.js"
	},
	"/assets/gold-BOvydcxD.jpg": {
		"type": "image/jpeg",
		"etag": "\"45be2-VvrQiD1GJJBhHkgcDYbNCzeNyaQ\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 285666,
		"path": "../public/assets/gold-BOvydcxD.jpg"
	},
	"/assets/hero-DLX2dXcx.jpg": {
		"type": "image/jpeg",
		"etag": "\"108a6-CsemLsxp9DDQ9NsvBJh0VDV//fs\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 67750,
		"path": "../public/assets/hero-DLX2dXcx.jpg"
	},
	"/assets/index-DoZU5X83.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7bb38-OTgZBSrfv9KVwx/9kZVXqdwgLtA\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 506680,
		"path": "../public/assets/index-DoZU5X83.js"
	},
	"/assets/key-round-DAmIS7LX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"163-//c3vvkVBJvisokj7DIz2IZhDOs\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 355,
		"path": "../public/assets/key-round-DAmIS7LX.js"
	},
	"/assets/diamond-B68BqYGw.jpg": {
		"type": "image/jpeg",
		"etag": "\"4756c-nj/NQ3pjU4QJzK5yGdhpYidQhgU\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 292204,
		"path": "../public/assets/diamond-B68BqYGw.jpg"
	},
	"/assets/earth-lHNZv-th.jpg": {
		"type": "image/jpeg",
		"etag": "\"3f422-5hvlelrDeyJVULzqiK+pun4Bxho\"",
		"mtime": "2026-07-04T07:10:29.656Z",
		"size": 259106,
		"path": "../public/assets/earth-lHNZv-th.jpg"
	},
	"/assets/fire-C_NFMf4Z.jpg": {
		"type": "image/jpeg",
		"etag": "\"3fae2-mNtJBz0Juu0UUsZ0Lh/f0ODmk20\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 260834,
		"path": "../public/assets/fire-C_NFMf4Z.jpg"
	},
	"/assets/loader-circle-qcNSBAwY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"90-ZRjXgiDqNusqsMMSzfjA8RKIePQ\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 144,
		"path": "../public/assets/loader-circle-qcNSBAwY.js"
	},
	"/assets/lock-D3cGPBp9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ce-XSXFFFlCyOz4rSGB9tpPRhnkPi0\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 206,
		"path": "../public/assets/lock-D3cGPBp9.js"
	},
	"/assets/lovable-85P9udam.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15e-MdFhJedPJBhAPgsPkZ/hX5+IenI\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 350,
		"path": "../public/assets/lovable-85P9udam.js"
	},
	"/assets/m1-CmX34rYw.jpg": {
		"type": "image/jpeg",
		"etag": "\"93be-wRubD18/IfquexwtydSdBvemO9E\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 37822,
		"path": "../public/assets/m1-CmX34rYw.jpg"
	},
	"/assets/m10-BxvKYq3y.jpg": {
		"type": "image/jpeg",
		"etag": "\"791c-Fq7XbtWkswZ48D/LeFibF5JSXNI\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 31004,
		"path": "../public/assets/m10-BxvKYq3y.jpg"
	},
	"/assets/m2-OdlY0n7O.jpg": {
		"type": "image/jpeg",
		"etag": "\"a8cd-oIXLim1sPjuKspRpOZab9m/5qG0\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 43213,
		"path": "../public/assets/m2-OdlY0n7O.jpg"
	},
	"/assets/m3-CA0BalRS.jpg": {
		"type": "image/jpeg",
		"etag": "\"998b-JysHDrB30d2sOXjr7trnDLYcYQQ\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 39307,
		"path": "../public/assets/m3-CA0BalRS.jpg"
	},
	"/assets/m4-Bk0FhE8X.jpg": {
		"type": "image/jpeg",
		"etag": "\"9f93-5XjwJ5ytH3c/aDzq/LpP7mJ3bmU\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 40851,
		"path": "../public/assets/m4-Bk0FhE8X.jpg"
	},
	"/assets/m5-LqUeZiT3.jpg": {
		"type": "image/jpeg",
		"etag": "\"7e3c-LGmB5U9os06wnndkybNVCGAzNrU\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 32316,
		"path": "../public/assets/m5-LqUeZiT3.jpg"
	},
	"/assets/m6-BeOzYhe5.jpg": {
		"type": "image/jpeg",
		"etag": "\"cc1b-vCwH5U+3h8dYKvvsrOCCpJ6J1UI\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 52251,
		"path": "../public/assets/m6-BeOzYhe5.jpg"
	},
	"/assets/m7-BzYEJoIq.jpg": {
		"type": "image/jpeg",
		"etag": "\"9e1f-byUUgwcduzD1sNuXvzV9OdQrwkg\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 40479,
		"path": "../public/assets/m7-BzYEJoIq.jpg"
	},
	"/assets/m8-DbZJGgB9.jpg": {
		"type": "image/jpeg",
		"etag": "\"a636-jPJO88OyQzet5jcGKKRVNGdPpRw\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 42550,
		"path": "../public/assets/m8-DbZJGgB9.jpg"
	},
	"/assets/m9-BQ6cy3kj.jpg": {
		"type": "image/jpeg",
		"etag": "\"e000-39j0DWWnf88kRPJnVsxmvpPhJMs\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 57344,
		"path": "../public/assets/m9-BQ6cy3kj.jpg"
	},
	"/assets/matchContext-Cdm6BuE4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8b-rA/ryEg6GFCqCdnm5FA4mG4n4js\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 139,
		"path": "../public/assets/matchContext-Cdm6BuE4.js"
	},
	"/assets/mods-BYdB9DyD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8a-Y8Wz5k82E2hmDibziZ24GHD61zc\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 138,
		"path": "../public/assets/mods-BYdB9DyD.js"
	},
	"/assets/mods._slug-653TgYgy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"101-rObz6R4mwDShjGqR0Tx1omVQLis\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 257,
		"path": "../public/assets/mods._slug-653TgYgy.js"
	},
	"/assets/mods._slug-BWsFQlRD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"240-xyK0hWCoouC0R7LQ8xgkvxsXZzo\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 576,
		"path": "../public/assets/mods._slug-BWsFQlRD.js"
	},
	"/assets/mods._slug-DcplQZyT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"602c-8LiqToW60/XF93AHmU12EBSWYkw\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 24620,
		"path": "../public/assets/mods._slug-DcplQZyT.js"
	},
	"/assets/mods.index-B69yP-mU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1519-vwu42fBEDM3Vc5Pr8WjfqodAavo\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 5401,
		"path": "../public/assets/mods.index-B69yP-mU.js"
	},
	"/assets/profile-BehxQv0k.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d64-UUhguUffELCOqX50O1Zk79ay2YY\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 7524,
		"path": "../public/assets/profile-BehxQv0k.js"
	},
	"/assets/routes-SZLEHOwe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2812-dv0tQW3gZGmmJY6tqbmkj9af+MI\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 10258,
		"path": "../public/assets/routes-SZLEHOwe.js"
	},
	"/assets/save-5o_21I70.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"147-Qxtv/USP1WBPivl9c++rzygzLTg\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 327,
		"path": "../public/assets/save-5o_21I70.js"
	},
	"/assets/shield-check-7Pq_BSoC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b0-OBGdBnV9lbZPSnP47nqr7eQd2vE\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 432,
		"path": "../public/assets/shield-check-7Pq_BSoC.js"
	},
	"/assets/spirit-BhFyjKK7.jpg": {
		"type": "image/jpeg",
		"etag": "\"469ff-FS9cuNir2zd65hrECH2g6pJhek4\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 289279,
		"path": "../public/assets/spirit-BhFyjKK7.jpg"
	},
	"/assets/star-DMf2-6Qy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d8-ZcH81Kt/1DqS3z5A3JXPaZvhdgk\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 472,
		"path": "../public/assets/star-DMf2-6Qy.js"
	},
	"/assets/styles-BAlCOB5n.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"2009a-kLP4NXM73uYnMzVYm92qa2vNe7U\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 131226,
		"path": "../public/assets/styles-BAlCOB5n.css"
	},
	"/assets/thunder-CHEgJy3j.jpg": {
		"type": "image/jpeg",
		"etag": "\"43300-GDBv001BY5yAMeXx8FsiGcFeXF8\"",
		"mtime": "2026-07-04T07:10:29.660Z",
		"size": 275200,
		"path": "../public/assets/thunder-CHEgJy3j.jpg"
	},
	"/assets/trash-2-B04NGzqG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148-QflXZ3lpbtDY8ZEjDrpiQ4jx5pQ\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 328,
		"path": "../public/assets/trash-2-B04NGzqG.js"
	},
	"/assets/unlock-CEyP8NUz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"163c9-9+kcWeMPLNJ3kWRpyfFNzTfzidk\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 91081,
		"path": "../public/assets/unlock-CEyP8NUz.js"
	},
	"/assets/useStore-BS3ea2yH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6e65-8KRUxcvRBCudDraTi4lXErIIhMc\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 28261,
		"path": "../public/assets/useStore-BS3ea2yH.js"
	},
	"/assets/users-Dgugzq0i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"132-ZhEtpsNwHe0v2OGE0CTUikhrRqc\"",
		"mtime": "2026-07-04T07:10:29.652Z",
		"size": 306,
		"path": "../public/assets/users-Dgugzq0i.js"
	},
	"/assets/water-r_Youjiu.jpg": {
		"type": "image/jpeg",
		"etag": "\"4f6dd-OKZ673711vydvCUrgU45/BxEKVE\"",
		"mtime": "2026-07-04T07:10:29.664Z",
		"size": 325341,
		"path": "../public/assets/water-r_Youjiu.jpg"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_chokidar@5.0.0_dotenv@17.4.2_jiti@1.21.7_vite@8.1.3_@types+node@22.20.0_jiti@1.21.7_/node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_N4QVD6 = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_N4QVD6
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_chokidar@5.0.0_dotenv@17.4.2_jiti@1.21.7_vite@8.1.3_@types+node@22.20.0_jiti@1.21.7_/node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_chokidar@5.0.0_dotenv@17.4.2_jiti@1.21.7_vite@8.1.3_@types+node@22.20.0_jiti@1.21.7_/node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_chokidar@5.0.0_dotenv@17.4.2_jiti@1.21.7_vite@8.1.3_@types+node@22.20.0_jiti@1.21.7_/node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/.pnpm/nitro@3.0.260603-beta_chokidar@5.0.0_dotenv@17.4.2_jiti@1.21.7_vite@8.1.3_@types+node@22.20.0_jiti@1.21.7_/node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
