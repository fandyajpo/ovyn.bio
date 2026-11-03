/**
 * Compatibility shim: the limits now live in the shared media categories
 * module, which the browser pipeline and the server validate against alike.
 */
export { MEDIA_LIMITS as CLIENT_UPLOAD_LIMITS, formatFileSize } from '#lib/media/categories';