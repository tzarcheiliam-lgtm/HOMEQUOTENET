module.exports = [
"[externals]/pdfjs-dist/legacy/build/pdf.mjs [external] (pdfjs-dist/legacy/build/pdf.mjs, esm_import, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/[externals]_pdfjs-dist_legacy_build_pdf_mjs_e7f5901c._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/pdfjs-dist/legacy/build/pdf.mjs [external] (pdfjs-dist/legacy/build/pdf.mjs, esm_import)");
    });
});
}),
"[externals]/tesseract.js [external] (tesseract.js, cjs, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/[externals]_tesseract_463eb979.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/tesseract.js [external] (tesseract.js, cjs)");
    });
});
}),
"[project]/node_modules/@cantoo/pdf-lib/es/index.js [app-rsc] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/node_modules_@cantoo_pdf-lib_es_e6e35fc1._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/@cantoo/pdf-lib/es/index.js [app-rsc] (ecmascript)");
    });
});
}),
];