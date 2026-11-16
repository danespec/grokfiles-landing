(function () {
  "use strict";
  if (window.GAHConsent) return;

  var STORAGE_KEY = "gah_consent_v1";
  var sessionConsent = null;
  var cmpDecisionReady = false, cmpNotApplicable = false;
  var DEFAULT_CONSENT = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });
  window.gtag("set", "ads_data_redaction", true);

  // Choose the visitor's browser language, never their IP address or inferred nationality.
  // English remains the fallback. All strings are static and never interpolated from user input.
  var english = ["Privacy choices","Essential site functions always stay on. Optional Google Analytics helps us understand how the archive is used. It uses cookies only if you allow them. Advertising is off.","Reject nonessential","Settings","Allow analytics","Accept all","Privacy policy","Analytics storage","Advertising storage","Advertising user data","Personalized advertising","Cancel","Save","Limited cookieless Google measurement may occur before you choose. Reject nonessential stops subsequent measurement."];
  var translations = {
    es:["Opciones de privacidad","Las funciones esenciales siguen activas. Google Analytics es opcional y nos ayuda a entender c\u00f3mo se usa el archivo. Solo utiliza cookies si las permites. La publicidad est\u00e1 desactivada.","Rechazar lo no esencial","Configuraci\u00f3n","Permitir anal\u00edtica","Aceptar todo","Pol\u00edtica de privacidad","Almacenamiento de anal\u00edtica","Almacenamiento publicitario","Datos de usuario publicitarios","Publicidad personalizada","Cancelar","Guardar","Antes de elegir, puede enviarse una medici\u00f3n limitada de Google sin cookies. Rechazar lo no esencial detiene las mediciones posteriores."],
    bn:["\u0997\u09cb\u09aa\u09a8\u09c0\u09af\u09bc\u09a4\u09be\u09b0 \u09aa\u099b\u09a8\u09cd\u09a6","\u09b8\u09be\u0987\u099f\u09c7\u09b0 \u099c\u09b0\u09c1\u09b0\u09bf \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b0\u09ae \u09b8\u09ac\u09b8\u09ae\u09af\u09bc \u099a\u09be\u09b2\u09c1 \u09a5\u09be\u0995\u09c7\u0964 \u0990\u099a\u09cd\u099b\u09bf\u0995 Google Analytics \u0986\u09ae\u09be\u09a6\u09c7\u09b0 \u0986\u09b0\u09cd\u0995\u09be\u0987\u09ad\u09c7\u09b0 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u09ac\u09c1\u099d\u09a4\u09c7 \u09b8\u09be\u09b9\u09be\u09af\u09cd\u09af \u0995\u09b0\u09c7\u0964 \u0986\u09aa\u09a8\u09be\u09b0 \u0985\u09a8\u09c1\u09ae\u09a4\u09bf \u09aa\u09c7\u09b2\u09c7\u0987 \u098f\u099f\u09bf \u0995\u09c1\u0995\u09bf \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09c7\u0964 \u09ac\u09bf\u099c\u09cd\u099e\u09be\u09aa\u09a8 \u09ac\u09a8\u09cd\u09a7 \u0986\u099b\u09c7\u0964","\u0985\u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u09c0\u09af\u09bc \u09b8\u09ac \u09aa\u09cd\u09b0\u09a4\u09cd\u09af\u09be\u0996\u09cd\u09af\u09be\u09a8","\u09b8\u09c7\u099f\u09bf\u0982\u09b8","\u0985\u09cd\u09af\u09be\u09a8\u09be\u09b2\u09bf\u099f\u09bf\u0995\u09cd\u09b8\u09c7\u09b0 \u0985\u09a8\u09c1\u09ae\u09a4\u09bf \u09a6\u09bf\u09a8","\u09b8\u09ac \u0997\u09cd\u09b0\u09b9\u09a3 \u0995\u09b0\u09c1\u09a8","\u0997\u09cb\u09aa\u09a8\u09c0\u09af\u09bc\u09a4\u09be \u09a8\u09c0\u09a4\u09bf","\u0985\u09cd\u09af\u09be\u09a8\u09be\u09b2\u09bf\u099f\u09bf\u0995\u09cd\u09b8 \u09b8\u09cd\u099f\u09cb\u09b0\u09c7\u099c","\u09ac\u09bf\u099c\u09cd\u099e\u09be\u09aa\u09a8 \u09b8\u09cd\u099f\u09cb\u09b0\u09c7\u099c","\u09ac\u09bf\u099c\u09cd\u099e\u09be\u09aa\u09a8\u09c7\u09b0 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0\u0995\u09be\u09b0\u09c0 \u09a4\u09a5\u09cd\u09af","\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4\u0995\u09c3\u09a4 \u09ac\u09bf\u099c\u09cd\u099e\u09be\u09aa\u09a8","\u09ac\u09be\u09a4\u09bf\u09b2","\u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3","\u09aa\u099b\u09a8\u09cd\u09a6 \u099c\u09be\u09a8\u09be\u09a8\u09cb\u09b0 \u0986\u0997\u09c7 \u0995\u09c1\u0995\u09bf \u099b\u09be\u09a1\u09bc\u09be \u09b8\u09c0\u09ae\u09bf\u09a4 Google \u09aa\u09b0\u09bf\u09ae\u09be\u09aa \u09b9\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u0964 \u0985\u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u09c0\u09af\u09bc \u09b8\u09ac \u09aa\u09cd\u09b0\u09a4\u09cd\u09af\u09be\u0996\u09cd\u09af\u09be\u09a8 \u0995\u09b0\u09b2\u09c7 \u09aa\u09b0\u09ac\u09b0\u09cd\u09a4\u09c0 \u09aa\u09b0\u09bf\u09ae\u09be\u09aa \u09ac\u09a8\u09cd\u09a7 \u09b9\u09af\u09bc\u0964"],
    ur:["\u0631\u0627\u0632\u062f\u0627\u0631\u06cc \u06a9\u06d2 \u0627\u062e\u062a\u06cc\u0627\u0631\u0627\u062a","\u0633\u0627\u0626\u0679 \u06a9\u06d2 \u0636\u0631\u0648\u0631\u06cc \u0627\u0641\u0639\u0627\u0644 \u06c1\u0645\u06cc\u0634\u06c1 \u0641\u0639\u0627\u0644 \u0631\u06c1\u062a\u06d2 \u06c1\u06cc\u06ba\u06d4 \u0627\u062e\u062a\u06cc\u0627\u0631\u06cc Google Analytics \u0633\u06d2 \u06c1\u0645\u06cc\u06ba \u0622\u0631\u06a9\u0627\u0626\u06cc\u0648 \u06a9\u06d2 \u0627\u0633\u062a\u0639\u0645\u0627\u0644 \u06a9\u0648 \u0633\u0645\u062c\u06be\u0646\u06d2 \u0645\u06cc\u06ba \u0645\u062f\u062f \u0645\u0644\u062a\u06cc \u06c1\u06d2\u06d4 \u06cc\u06c1 \u0635\u0631\u0641 \u0622\u067e \u06a9\u06cc \u0627\u062c\u0627\u0632\u062a \u0633\u06d2 \u06a9\u0648\u06a9\u06cc\u0632 \u0627\u0633\u062a\u0639\u0645\u0627\u0644 \u06a9\u0631\u062a\u0627 \u06c1\u06d2\u06d4 \u0627\u0634\u062a\u06c1\u0627\u0631\u0627\u062a \u0628\u0646\u062f \u06c1\u06cc\u06ba\u06d4","\u063a\u06cc\u0631 \u0636\u0631\u0648\u0631\u06cc \u0631\u062f \u06a9\u0631\u06cc\u06ba","\u062a\u0631\u062a\u06cc\u0628\u0627\u062a","\u062a\u062c\u0632\u06cc\u0627\u062a \u06a9\u06cc \u0627\u062c\u0627\u0632\u062a \u062f\u06cc\u06ba","\u0633\u0628 \u0642\u0628\u0648\u0644 \u06a9\u0631\u06cc\u06ba","\u0631\u0627\u0632\u062f\u0627\u0631\u06cc \u06a9\u06cc \u067e\u0627\u0644\u06cc\u0633\u06cc","\u062a\u062c\u0632\u06cc\u0627\u062a\u06cc \u0630\u062e\u06cc\u0631\u06c1","\u0627\u0634\u062a\u06c1\u0627\u0631\u06cc \u0630\u062e\u06cc\u0631\u06c1","\u0627\u0634\u062a\u06c1\u0627\u0631\u0627\u062a \u06a9\u06d2 \u0644\u06cc\u06d2 \u0635\u0627\u0631\u0641 \u06a9\u0627 \u0688\u06cc\u0679\u0627","\u0630\u0627\u062a\u06cc \u0646\u0648\u0639\u06cc\u062a \u06a9\u06d2 \u0627\u0634\u062a\u06c1\u0627\u0631\u0627\u062a","\u0645\u0646\u0633\u0648\u062e \u06a9\u0631\u06cc\u06ba","\u0645\u062d\u0641\u0648\u0638 \u06a9\u0631\u06cc\u06ba","\u0627\u0646\u062a\u062e\u0627\u0628 \u0633\u06d2 \u067e\u06c1\u0644\u06d2 \u06a9\u0648\u06a9\u06cc\u0632 \u06a9\u06d2 \u0628\u063a\u06cc\u0631 \u0645\u062d\u062f\u0648\u062f Google \u067e\u06cc\u0645\u0627\u0626\u0634 \u06c1\u0648 \u0633\u06a9\u062a\u06cc \u06c1\u06d2\u06d4 \u063a\u06cc\u0631 \u0636\u0631\u0648\u0631\u06cc \u0631\u062f \u06a9\u0631\u0646\u06d2 \u0633\u06d2 \u0628\u0639\u062f \u06a9\u06cc \u067e\u06cc\u0645\u0627\u0626\u0634 \u0631\u06a9 \u062c\u0627\u062a\u06cc \u06c1\u06d2\u06d4"],
    hi:["\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0935\u093f\u0915\u0932\u094d\u092a","\u0938\u093e\u0907\u091f \u0915\u0940 \u0906\u0935\u0936\u094d\u092f\u0915 \u0938\u0941\u0935\u093f\u0927\u093e\u090f\u0901 \u0939\u092e\u0947\u0936\u093e \u091a\u093e\u0932\u0942 \u0930\u0939\u0924\u0940 \u0939\u0948\u0902\u0964 \u0935\u0948\u0915\u0932\u094d\u092a\u093f\u0915 Google Analytics \u0939\u092e\u0947\u0902 \u0938\u0902\u0917\u094d\u0930\u0939 \u0915\u0947 \u0909\u092a\u092f\u094b\u0917 \u0915\u094b \u0938\u092e\u091d\u0928\u0947 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930\u0924\u093e \u0939\u0948\u0964 \u092f\u0939 \u0906\u092a\u0915\u0940 \u0905\u0928\u0941\u092e\u0924\u093f \u092a\u0930 \u0939\u0940 \u0915\u0941\u0915\u0940 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0924\u093e \u0939\u0948\u0964 \u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928 \u092c\u0902\u0926 \u0939\u0948\u0902\u0964","\u0917\u0948\u0930-\u091c\u093c\u0930\u0942\u0930\u0940 \u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0947\u0902","\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938","\u090f\u0928\u093e\u0932\u093f\u091f\u093f\u0915\u094d\u0938 \u0915\u0940 \u0905\u0928\u0941\u092e\u0924\u093f \u0926\u0947\u0902","\u0938\u092d\u0940 \u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0947\u0902","\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0928\u0940\u0924\u093f","\u090f\u0928\u093e\u0932\u093f\u091f\u093f\u0915\u094d\u0938 \u0938\u0902\u0917\u094d\u0930\u0939\u0923","\u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928 \u0938\u0902\u0917\u094d\u0930\u0939\u0923","\u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928 \u0915\u0947 \u0932\u093f\u090f \u0909\u092a\u092f\u094b\u0917\u0915\u0930\u094d\u0924\u093e \u0921\u0947\u091f\u093e","\u0935\u0948\u092f\u0915\u094d\u0924\u093f\u0915\u0943\u0924 \u0935\u093f\u091c\u094d\u091e\u093e\u092a\u0928","\u0930\u0926\u094d\u0926 \u0915\u0930\u0947\u0902","\u0938\u0939\u0947\u091c\u0947\u0902","\u0906\u092a\u0915\u0947 \u091a\u092f\u0928 \u0938\u0947 \u092a\u0939\u0932\u0947 \u092c\u093f\u0928\u093e \u0915\u0941\u0915\u0940 \u0938\u0940\u092e\u093f\u0924 Google \u092e\u093e\u092a\u0928 \u0939\u094b \u0938\u0915\u0924\u093e \u0939\u0948\u0964 \u0917\u0948\u0930-\u091c\u093c\u0930\u0942\u0930\u0940 \u0905\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0928\u0947 \u0938\u0947 \u0906\u0917\u0947 \u0915\u093e \u092e\u093e\u092a\u0928 \u0930\u0941\u0915 \u091c\u093e\u0924\u093e \u0939\u0948\u0964"],
    pt:["Op\u00e7\u00f5es de privacidade","As fun\u00e7\u00f5es essenciais permanecem ativas. O Google Analytics \u00e9 opcional e nos ajuda a entender o uso do arquivo. S\u00f3 utiliza cookies com sua autoriza\u00e7\u00e3o. A publicidade est\u00e1 desativada.","Rejeitar n\u00e3o essenciais","Configura\u00e7\u00f5es","Permitir an\u00e1lise","Aceitar tudo","Pol\u00edtica de privacidade","Armazenamento de an\u00e1lise","Armazenamento publicit\u00e1rio","Dados de usu\u00e1rio para publicidade","Publicidade personalizada","Cancelar","Salvar","Antes da escolha, pode haver medi\u00e7\u00e3o limitada do Google sem cookies. Rejeitar n\u00e3o essenciais interrompe a medi\u00e7\u00e3o posterior."],
    fr:["Choix de confidentialit\u00e9","Les fonctions essentielles restent actives. Google Analytics est facultatif et nous aide \u00e0 comprendre l\u2019utilisation des archives. Les cookies ne sont utilis\u00e9s qu\u2019avec votre autorisation. La publicit\u00e9 est d\u00e9sactiv\u00e9e.","Refuser le non essentiel","Param\u00e8tres","Autoriser la mesure d\u2019audience","Tout accepter","Politique de confidentialit\u00e9","Stockage analytique","Stockage publicitaire","Donn\u00e9es utilisateur publicitaires","Publicit\u00e9 personnalis\u00e9e","Annuler","Enregistrer","Une mesure Google limit\u00e9e sans cookies peut avoir lieu avant votre choix. Le refus du non essentiel arr\u00eate les mesures suivantes."],
    de:["Datenschutzeinstellungen","Notwendige Funktionen bleiben aktiv. Das optionale Google Analytics hilft uns, die Nutzung des Archivs zu verstehen. Cookies werden nur mit Ihrer Erlaubnis verwendet. Werbung ist deaktiviert.","Nicht notwendige ablehnen","Einstellungen","Analyse erlauben","Alle akzeptieren","Datenschutzerkl\u00e4rung","Analysespeicherung","Werbespeicherung","Nutzerdaten f\u00fcr Werbung","Personalisierte Werbung","Abbrechen","Speichern","Vor Ihrer Wahl kann eine eingeschr\u00e4nkte Google-Messung ohne Cookies erfolgen. Die Ablehnung stoppt weitere Messungen."],
    zh:["\u9690\u79c1\u9009\u9879","\u7f51\u7ad9\u5fc5\u8981\u529f\u80fd\u59cb\u7ec8\u5f00\u542f\u3002\u53ef\u9009\u7684 Google Analytics \u5e2e\u52a9\u6211\u4eec\u4e86\u89e3\u6863\u6848\u7684\u4f7f\u7528\u60c5\u51b5\u3002\u53ea\u6709\u83b7\u5f97\u60a8\u7684\u5141\u8bb8\u624d\u4f7f\u7528 Cookie\u3002\u5e7f\u544a\u5df2\u5173\u95ed\u3002","\u62d2\u7edd\u975e\u5fc5\u8981\u9879\u76ee","\u8bbe\u7f6e","\u5141\u8bb8\u5206\u6790","\u5168\u90e8\u63a5\u53d7","\u9690\u79c1\u653f\u7b56","\u5206\u6790\u5b58\u50a8","\u5e7f\u544a\u5b58\u50a8","\u5e7f\u544a\u7528\u6237\u6570\u636e","\u4e2a\u6027\u5316\u5e7f\u544a","\u53d6\u6d88","\u4fdd\u5b58","\u5728\u60a8\u9009\u62e9\u4e4b\u524d\uff0cGoogle \u53ef\u80fd\u8fdb\u884c\u6709\u9650\u7684\u65e0 Cookie \u6d4b\u91cf\u3002\u62d2\u7edd\u975e\u5fc5\u8981\u9879\u76ee\u4f1a\u505c\u6b62\u540e\u7eed\u6d4b\u91cf\u3002"],
    id:["Pilihan privasi","Fungsi penting situs selalu aktif. Google Analytics bersifat opsional dan membantu kami memahami penggunaan arsip. Cookie hanya digunakan jika Anda mengizinkannya. Iklan dinonaktifkan.","Tolak yang tidak penting","Pengaturan","Izinkan analitik","Terima semua","Kebijakan privasi","Penyimpanan analitik","Penyimpanan iklan","Data pengguna untuk iklan","Iklan personal","Batal","Simpan","Pengukuran Google terbatas tanpa cookie dapat terjadi sebelum Anda memilih. Penolakan menghentikan pengukuran berikutnya."],
    vi:["L\u1ef1a ch\u1ecdn quy\u1ec1n ri\u00eang t\u01b0","C\u00e1c ch\u1ee9c n\u0103ng thi\u1ebft y\u1ebfu lu\u00f4n ho\u1ea1t \u0111\u1ed9ng. Google Analytics l\u00e0 t\u00f9y ch\u1ecdn, gi\u00fap ch\u00fang t\u00f4i hi\u1ec3u c\u00e1ch s\u1eed d\u1ee5ng kho l\u01b0u tr\u1eef. Cookie ch\u1ec9 \u0111\u01b0\u1ee3c d\u00f9ng khi b\u1ea1n cho ph\u00e9p. Qu\u1ea3ng c\u00e1o \u0111\u00e3 t\u1eaft.","T\u1eeb ch\u1ed1i m\u1ee5c kh\u00f4ng thi\u1ebft y\u1ebfu","C\u00e0i \u0111\u1eb7t","Cho ph\u00e9p ph\u00e2n t\u00edch","Ch\u1ea5p nh\u1eadn t\u1ea5t c\u1ea3","Ch\u00ednh s\u00e1ch ri\u00eang t\u01b0","L\u01b0u tr\u1eef ph\u00e2n t\u00edch","L\u01b0u tr\u1eef qu\u1ea3ng c\u00e1o","D\u1eef li\u1ec7u ng\u01b0\u1eddi d\u00f9ng cho qu\u1ea3ng c\u00e1o","Qu\u1ea3ng c\u00e1o c\u00e1 nh\u00e2n h\u00f3a","H\u1ee7y","L\u01b0u","Google c\u00f3 th\u1ec3 \u0111o l\u01b0\u1eddng gi\u1edbi h\u1ea1n kh\u00f4ng d\u00f9ng cookie tr\u01b0\u1edbc khi b\u1ea1n ch\u1ecdn. T\u1eeb ch\u1ed1i s\u1ebd d\u1eebng c\u00e1c ph\u00e9p \u0111o ti\u1ebfp theo."],
    ar:["\u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629","\u062a\u0628\u0642\u0649 \u0648\u0638\u0627\u0626\u0641 \u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629 \u0645\u0641\u0639\u0651\u0644\u0629 \u062f\u0627\u0626\u0645\u064b\u0627. \u064a\u0633\u0627\u0639\u062f\u0646\u0627 Google Analytics \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631\u064a \u0639\u0644\u0649 \u0641\u0647\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0623\u0631\u0634\u064a\u0641. \u0648\u0644\u0627 \u064a\u0633\u062a\u062e\u062f\u0645 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0644\u0627\u0631\u062a\u0628\u0627\u0637 \u0625\u0644\u0627 \u0628\u0625\u0630\u0646\u0643. \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0645\u0639\u0637\u0651\u0644\u0629.","\u0631\u0641\u0636 \u063a\u064a\u0631 \u0627\u0644\u0636\u0631\u0648\u0631\u064a","\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a","\u0627\u0644\u0633\u0645\u0627\u062d \u0628\u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a","\u0642\u0628\u0648\u0644 \u0627\u0644\u0643\u0644","\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629","\u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a","\u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a","\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0644\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a","\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062e\u0635\u0635\u0629","\u0625\u0644\u063a\u0627\u0621","\u062d\u0641\u0638","\u0642\u062f \u064a\u062a\u0645 \u0642\u064a\u0627\u0633 \u0645\u062d\u062f\u0648\u062f \u0645\u0646 Google \u062f\u0648\u0646 \u0645\u0644\u0641\u0627\u062a \u062a\u0639\u0631\u064a\u0641 \u0627\u0631\u062a\u0628\u0627\u0637 \u0642\u0628\u0644 \u0627\u062e\u062a\u064a\u0627\u0631\u0643. \u0627\u0644\u0631\u0641\u0636 \u064a\u0648\u0642\u0641 \u0627\u0644\u0642\u064a\u0627\u0633 \u0627\u0644\u0644\u0627\u062d\u0642."],
    ja:["\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u8a2d\u5b9a","\u30b5\u30a4\u30c8\u306e\u5fc5\u9808\u6a5f\u80fd\u306f\u5e38\u306b\u6709\u52b9\u3067\u3059\u3002\u4efb\u610f\u306e Google Analytics \u306f\u30a2\u30fc\u30ab\u30a4\u30d6\u306e\u5229\u7528\u72b6\u6cc1\u306e\u628a\u63e1\u306b\u5f79\u7acb\u3061\u307e\u3059\u3002\u8a31\u53ef\u3057\u305f\u5834\u5408\u306e\u307f Cookie \u3092\u4f7f\u7528\u3057\u307e\u3059\u3002\u5e83\u544a\u306f\u7121\u52b9\u3067\u3059\u3002","\u5fc5\u9808\u3067\u306a\u3044\u9805\u76ee\u3092\u62d2\u5426","\u8a2d\u5b9a","\u5206\u6790\u3092\u8a31\u53ef","\u3059\u3079\u3066\u8a31\u53ef","\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc\u30dd\u30ea\u30b7\u30fc","\u5206\u6790\u7528\u30b9\u30c8\u30ec\u30fc\u30b8","\u5e83\u544a\u7528\u30b9\u30c8\u30ec\u30fc\u30b8","\u5e83\u544a\u7528\u30e6\u30fc\u30b6\u30fc\u30c7\u30fc\u30bf","\u30d1\u30fc\u30bd\u30ca\u30e9\u30a4\u30ba\u5e83\u544a","\u30ad\u30e3\u30f3\u30bb\u30eb","\u4fdd\u5b58","\u9078\u629e\u524d\u306b Cookie \u3092\u4f7f\u7528\u3057\u306a\u3044\u9650\u5b9a\u7684\u306a Google \u306e\u8a08\u6e2c\u304c\u884c\u308f\u308c\u308b\u5834\u5408\u304c\u3042\u308a\u307e\u3059\u3002\u62d2\u5426\u3059\u308b\u3068\u4ee5\u964d\u306e\u8a08\u6e2c\u3092\u505c\u6b62\u3057\u307e\u3059\u3002"]
  };
  var locale = [navigator.language || 'en'].concat(navigator.languages || []).map(function(x){return String(x).toLowerCase().split('-')[0];}).find(function(x){return x === 'en' || Object.prototype.hasOwnProperty.call(translations,x);}) || 'en';
  var words = translations[locale] || english;
  function t(i) { return words[i] || english[i]; }
  function localize(node) { node.lang=locale; if (locale==='ar'||locale==='ur') node.dir='rtl'; }
  function adsEnabled() { return (window.GAH_CONSENT_BOOT || {}).adsenseApproved === true; }

  function routePolicy() {
    var meta = document.querySelector('meta[name="gah-ad-status"]');
    var eligible = document.querySelector('meta[name="gah-ad-eligible"]');
    return {
      adStatus: meta ? meta.getAttribute("content") || "" : "",
      adEligible: eligible ? eligible.getAttribute("content") === "true" : false
    };
  }

  function readStoredConsent() {
    try {
      var cookie = document.cookie.split('; ').find(function (v) { return v.indexOf('gah_consent_shared_v1=') === 0; });
      var raw = cookie ? decodeURIComponent(cookie.slice('gah_consent_shared_v1='.length)) : window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.choice || !Number.isFinite(Date.parse(parsed.updated_at)) || Date.now() - Date.parse(parsed.updated_at) > 15552000000) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeStoredConsent(choice, consent) {
    try {
      var record = JSON.stringify({
        version: 1,
        choice: choice,
        consent: consent,
        updated_at: new Date().toISOString()
      });
      try { window.localStorage.setItem(STORAGE_KEY, record); } catch (_) {}
      if (/^(?:www\.)?grokarchivehub\.com$|^wiki\.grokarchivehub\.com$/.test(location.hostname)) document.cookie = 'gah_consent_shared_v1=' + encodeURIComponent(record) + '; Max-Age=15552000; Path=/; Domain=grokarchivehub.com; Secure; SameSite=Lax';
    } catch (_) {
      return false;
    }
    return true;
  }

  function applyConsent(consent, prechoice) {
    var next = Object.assign({}, DEFAULT_CONSENT, consent || {});
    sessionConsent = next;
    // One runtime owns tag configuration, consent updates and pageviews.
    document.documentElement.dataset.gahConsent = JSON.stringify(next);
    loadGoogleTagIfAllowed(next, prechoice);
    window.dispatchEvent(new CustomEvent("gah:consent:update", { detail: next }));
  }

  function loadGoogleTagIfAllowed(consent, prechoice) {
    if (window.GAHAnalytics) window.GAHAnalytics.applyConsent(consent, {prechoice: prechoice === true});
  }

  function currentConsent() {
    var stored = readStoredConsent();
    return sessionConsent || (stored && stored.consent ? Object.assign({}, DEFAULT_CONSENT, stored.consent) : Object.assign({}, DEFAULT_CONSENT));
  }

  function removeDuplicateUi() {
    document.querySelectorAll("[data-gah-consent-ui]").forEach(function (node, index) {
      if (index > 0) node.remove();
    });
  }

  function button(text, action, primary) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = primary ? "gah-consent-button primary" : "gah-consent-button";
    btn.textContent = text;
    btn.setAttribute("data-gah-consent-action", action);
    return btn;
  }

  // GAH-ADSENSE-REMEDIATION-001: defer first-party UI when Google Privacy & messaging / TCF CMP is live
  function googleCmpPresent() {
    try {
      if (typeof window.__tcfapi === "function") return true;
      if (window.googlefc && window.googlefc.controlledMessagingFunction) return true;
      if (document.querySelector('script[src*="fundingchoicesmessages.google.com"], script[src*="fundingchoices"], iframe[src*="fundingchoicesmessages.google.com"]')) return true;
      if (document.documentElement && document.documentElement.getAttribute("data-google-cmp") === "active") return true;
    } catch (_) {}
    return false;
  }

  function shouldDeferToGoogleCmp() {
    var boot = window.GAH_CONSENT_BOOT || {};
    if (boot.deferToGoogleCmpWhenPresent === false || !boot.googleCmpAnalyticsEnabled || cmpNotApplicable) return false;
    return googleCmpPresent();
  }

  function showBanner() {
    if (shouldDeferToGoogleCmp()) return;
    if (document.querySelector("[data-gah-consent-ui]")) return;
    var wrap = document.createElement("section");
    wrap.className = "gah-consent-banner";
    wrap.setAttribute("data-gah-consent-ui", "banner");
    localize(wrap);
    wrap.setAttribute("aria-label", t(0));
    var intro=document.createElement("div"), heading=document.createElement("strong"), copy=document.createElement("p"), policy=document.createElement("a");
    heading.textContent=t(0);
    copy.textContent=(adsEnabled() ? "Essential site functions remain active. Optional analytics and advertising storage require your permission." : t(1)) + ((window.GAH_CONSENT_BOOT || {}).advancedAnalytics ? " " + t(13) : "") + " ";
    policy.href="https://grokarchivehub.com/privacy"; policy.textContent=t(6);
    copy.appendChild(policy);intro.append(heading,copy);wrap.appendChild(intro);
    var actions = document.createElement("div");
    actions.className = "gah-consent-actions";
    actions.appendChild(button(t(2), "reject", false));
    actions.appendChild(button(t(3), "settings", false));
    actions.appendChild(button(adsEnabled() ? t(5) : t(4), "accept", false));
    wrap.appendChild(actions);
    document.body.appendChild(wrap);
    removeDuplicateUi();
    window.requestAnimationFrame(updateConsentReserve);
    window.setTimeout(updateConsentReserve, 50);
    window.setTimeout(updateConsentReserve, 250);
    observeConsentBanner(wrap);
  }

  function showReopenControl() {
    if (document.querySelector("[data-gah-consent-ui]")) return;
    if (document.querySelector("[data-gah-consent-reopen]")) return;
    var reopen = document.createElement("button");
    reopen.type = "button";
    reopen.className = "gah-consent-reopen";
    reopen.setAttribute("data-gah-consent-reopen", "true");
    localize(reopen); reopen.textContent = t(0);
    reopen.addEventListener("click", showSettings);
    document.body.appendChild(reopen);
  }

  function setConsentReserve(px) {
    var root = document.documentElement;
    var value = Math.max(0, Math.ceil(Number(px) || 0));
    if (value > 0) {
      root.style.setProperty("--gah-consent-reserve", value + "px");
      root.setAttribute("data-gah-consent-banner", "1");
    } else {
      root.style.setProperty("--gah-consent-reserve", "0px");
      root.removeAttribute("data-gah-consent-banner");
    }
    try {
      window.dispatchEvent(new Event("gah:consent:reserve"));
    } catch (_) {}
  }

  function updateConsentReserve() {
    var banner = document.querySelector("[data-gah-consent-ui='banner']");
    if (!banner || !banner.isConnected) {
      setConsentReserve(0);
      return;
    }
    var height = Math.ceil(banner.getBoundingClientRect().height);
    setConsentReserve(height > 0 ? height : 0);
  }

  function observeConsentBanner(banner) {
    if (typeof ResizeObserver !== "function") return;
    if (!observeConsentBanner.ro) {
      observeConsentBanner.ro = new ResizeObserver(function () {
        updateConsentReserve();
      });
    }
    if (banner) {
      try { observeConsentBanner.ro.observe(banner); } catch (_) {}
    }
  }

  function closeConsentUi() {
    document.querySelectorAll("[data-gah-consent-ui]").forEach(function (node) {
      node.remove();
    });
    updateConsentReserve();
  }

  function choiceConsent(choice, partial) {
    if (choice === "accept") {
      if (!adsEnabled()) return Object.assign({}, DEFAULT_CONSENT, {analytics_storage:"granted"});
      return {
        analytics_storage: "granted",
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted"
      };
    }
    if (choice === "partial") return Object.assign({}, DEFAULT_CONSENT, partial || {});
    return Object.assign({}, DEFAULT_CONSENT);
  }

  function persistChoice(choice, partial) {
    var consent = choiceConsent(choice, partial);
    writeStoredConsent(choice, consent);
    applyConsent(consent);
    closeConsentUi();
    showReopenControl();
  }

  function showSettings() {
    if (shouldDeferToGoogleCmp()) {
      window.googlefc.callbackQueue.push({CONSENT_API_READY: function () { window.googlefc.showRevocationMessage(); }});
      return;
    }
    closeConsentUi();
    var current = currentConsent();
    var panel = document.createElement("section");
    panel.className = "gah-consent-panel";
    panel.setAttribute("data-gah-consent-ui", "settings");
    localize(panel); panel.setAttribute("aria-label", t(0));
    panel.innerHTML = [
      "<div class=\"gah-consent-card\">",
      "<h2>Privacy choices</h2>",
      "<label><input type=\"checkbox\" data-consent-field=\"analytics_storage\"> Analytics storage</label>",
      "<label><input type=\"checkbox\" data-consent-field=\"ad_storage\"> Advertising storage</label>",
      "<label><input type=\"checkbox\" data-consent-field=\"ad_user_data\"> Advertising user data</label>",
      "<label><input type=\"checkbox\" data-consent-field=\"ad_personalization\"> Personalized advertising</label>",
      "<div class=\"gah-consent-actions\"></div>",
      "</div>"
    ].join("");
    panel.querySelector("h2").textContent=t(0);
    panel.querySelectorAll("[data-consent-field]").forEach(function (input,i) {
      input.checked = current[input.getAttribute("data-consent-field")] === "granted";
      input.parentNode.lastChild.textContent=" "+t(7+i);
      if (i>0 && !adsEnabled()) { input.checked=false;input.disabled=true;input.parentNode.hidden=true; }
    });
    var actions = panel.querySelector(".gah-consent-actions");
    actions.appendChild(button(t(11), "cancel", false));
    actions.appendChild(button(t(12), "save", true));
    document.body.appendChild(panel);
    removeDuplicateUi();
  }

  function consentForAnalytics() {
    return currentConsent().analytics_storage === "granted";
  }

  function sendAnalyticsEvent(name, params) {
    if (!consentForAnalytics()) return;
    try {
      if (window.GAHAnalytics) window.GAHAnalytics.event(name, params || {});
    } catch (_) {
      return;
    }
  }

  function installCtaTracking() {
    document.addEventListener("click", function (event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      var href = link.getAttribute("href") || "";
      if (/patreon\.com/i.test(href)) {
        sendAnalyticsEvent("patreon_cta_click", { cta_id: link.getAttribute("data-cta") || "patreon", destination_host: "patreon.com" });
      } else {
        try {
          var url = new URL(href, window.location.origin);
          if (url.origin !== window.location.origin && (url.protocol === "http:" || url.protocol === "https:")) {
            sendAnalyticsEvent("external_source_click", { destination_host: url.hostname });
          }
        } catch (_) {
          return;
        }
      }
    });
  }

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-gah-consent-action]") : null;
    if (!target) return;
    var action = target.getAttribute("data-gah-consent-action");
    if (action === "accept") persistChoice("accept");
    if (action === "reject") persistChoice("reject");
    if (action === "settings") showSettings();
    if (action === "cancel") {
      closeConsentUi();
      if (!readStoredConsent()) showBanner();
    }
    if (action === "save") {
      var partial = {};
      document.querySelectorAll("[data-consent-field]").forEach(function (input) {
        partial[input.getAttribute("data-consent-field")] = input.checked ? "granted" : "denied";
      });
      persistChoice("partial", partial);
    }
  });

  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  function syncGoogleConsent() {
    var fc = window.googlefc;
    if (typeof fc.getGoogleConsentModeValues !== 'function' || !fc.ConsentModePurposeStatusEnum) return;
    var value = fc.getGoogleConsentModeValues(), types = fc.ConsentModePurposeStatusEnum;
    if (!value || value.analyticsStoragePurposeConsentStatus == null) return;
    var status = value.analyticsStoragePurposeConsentStatus;
    var notApplicable = types.CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE;
    var notConfigured = types.CONSENT_MODE_PURPOSE_STATUS_NOT_CONFIGURED;
    if ((notApplicable != null && status === notApplicable) || (notConfigured != null && status === notConfigured)) {
      cmpNotApplicable = true;
      // Pending CMP startup temporarily applies denied consent. Recover the reader's
      // actual saved choice once the CMP explicitly says it does not govern this visit.
      var stored = readStoredConsent();
      applyConsent(stored && stored.consent ? stored.consent : DEFAULT_CONSENT, !stored);
      if (!stored) showBanner();
      showReopenControl();
      return;
    }
    if (status !== types.CONSENT_MODE_PURPOSE_STATUS_GRANTED && status !== types.CONSENT_MODE_PURPOSE_STATUS_DENIED) return;
    cmpNotApplicable = false;
    cmpDecisionReady = true;
    persistChoice('partial', {
      analytics_storage: status === types.CONSENT_MODE_PURPOSE_STATUS_GRANTED ? 'granted' : 'denied',
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
  }
  window.googlefc.callbackQueue.push({ CONSENT_MODE_DATA_READY: syncGoogleConsent });
  window.googlefc.callbackQueue.push({ CONSENT_API_READY: function () {
    if (typeof window.__tcfapi !== 'function') return;
    window.__tcfapi('addEventListener', 2, function (data, success) {
      if (success && data && data.eventStatus === 'useractioncomplete') window.googlefc.callbackQueue.push({CONSENT_MODE_DATA_READY: syncGoogleConsent});
    });
  }});

  var cmpPending = shouldDeferToGoogleCmp() && !cmpDecisionReady;
  applyConsent(cmpPending ? DEFAULT_CONSENT : currentConsent(), !cmpPending && !readStoredConsent());
  if (!readStoredConsent()) showBanner();
  showReopenControl();
  installCtaTracking();
  window.addEventListener("resize", updateConsentReserve);
  window.addEventListener("orientationchange", updateConsentReserve);
  window.addEventListener("load", updateConsentReserve);
  window.requestAnimationFrame(updateConsentReserve);
  if (document.body) document.body.setAttribute("data-gah-consent-ready", "1");
  else document.addEventListener("DOMContentLoaded", function () {
    document.body.setAttribute("data-gah-consent-ready", "1");
    updateConsentReserve();
  });

  // If Google CMP loads after our boot, remove competing first-party chrome.
  if (typeof MutationObserver === "function") {
    var cmpWatch = new MutationObserver(function () {
      if (!shouldDeferToGoogleCmp()) return;
      if (!cmpDecisionReady) applyConsent(DEFAULT_CONSENT);
      document.querySelectorAll("[data-gah-consent-ui]").forEach(function (node) {
        node.remove();
      });
      showReopenControl();
      updateConsentReserve();
    });
    cmpWatch.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () { try { cmpWatch.disconnect(); } catch (_) {} }, 15000);
  }

  window.GAHConsent = Object.freeze({
    current: currentConsent,
    reset: function () {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      document.cookie = 'gah_consent_shared_v1=; Max-Age=0; Path=/; Domain=grokarchivehub.com; Secure; SameSite=Lax';
      applyConsent(DEFAULT_CONSENT);
      showBanner();
    },
    routePolicy: routePolicy
  });
})();
