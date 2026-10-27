import { createHash } from 'crypto';
import { FileObjects, } from '../database/utils/database.js';
import { uploadAttachmentToCloudinary, deleteFromCloudinary } from './cloudinary.js';
/**
 * One way in for every uploaded object: schedule files, DPR photos, activity attachments
 * and generated client reports. Callers hand over bytes and a purpose; this validates
 * against that purpose's limits (AC-FIL-02), puts the bytes in storage and records the
 * file_object row (AC-FIL-01) that the owning entity then references.
 */
const MB = 1024 * 1024;
/** Thrown for anything the uploader can fix: too big, wrong type, unreadable encoding. */
export class FileValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FileValidationError';
    }
}
/** Thrown when storage itself fails, so the caller can answer 502 rather than 400. */
export class FileStorageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FileStorageError';
    }
}
/** AC-FIL-02. */
const PURPOSE_RULES = {
    schedule_mpp: {
        maxBytes: 50 * MB,
        mimeTypes: ['application/vnd.ms-project'],
        resourceType: 'raw',
        folder: 'schedules',
    },
    dpr_photo: {
        maxBytes: 10 * MB,
        mimeTypes: ['image/jpeg', 'image/png'],
        resourceType: 'image',
        folder: 'dpr-photos',
    },
    activity_attachment: {
        maxBytes: 25 * MB,
        mimeTypes: null,
        resourceType: 'raw',
        folder: 'stage-activity-attachments',
    },
    client_report_pdf: {
        maxBytes: 25 * MB,
        mimeTypes: ['application/pdf'],
        resourceType: 'raw',
        folder: 'client-reports',
    },
    // Supporting documents for a change request: PDFs, Office docs, images — same "any type"
    // approach as activity_attachment, since sniffMimeType doesn't recognize DOCX/XLSX yet.
    change_request_attachment: {
        maxBytes: 25 * MB,
        mimeTypes: null,
        resourceType: 'raw',
        folder: 'change-request-attachments',
    },
};
/** Images get the tighter cap even where the purpose allows more (AC-FIL-02). */
const IMAGE_MAX_BYTES = 10 * MB;
/**
 * AC-FIL-01 requires the type to be decided by content, not by the filename. These are the
 * magic numbers for every format we accept.
 *
 * shortcut: an .mpp is an OLE2 compound document, a container .doc and .xls also use, so this
 * confirms the container and not that MS Project wrote it. The parser is what settles that —
 * it answers 422 and the version is marked failed. Upgrade if we ever accept a format where
 * guessing wrong is more expensive than a failed parse.
 */
function sniffMimeType(bytes) {
    if (bytes.length >= 8 && bytes.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1') {
        return 'application/vnd.ms-project';
    }
    if (bytes.length >= 8 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
        return 'image/png';
    }
    if (bytes.length >= 3 && bytes.subarray(0, 3).toString('hex') === 'ffd8ff') {
        return 'image/jpeg';
    }
    if (bytes.length >= 5 && bytes.subarray(0, 5).toString('latin1') === '%PDF-') {
        return 'application/pdf';
    }
    return null;
}
/**
 * Accepts what the API layer receives: a data URI, a bare base64 string, or raw bytes.
 * Base64 is decoded strictly — Buffer.from silently drops invalid characters, which would
 * otherwise turn a corrupted upload into a short file rather than an error.
 */
export function decodeUploadedFile(file) {
    if (Buffer.isBuffer(file)) {
        return file;
    }
    const base64 = file.startsWith('data:') ? (file.split(',')[1] ?? '') : file;
    const cleaned = base64.trim();
    if (cleaned.length === 0) {
        throw new FileValidationError('No file content was provided');
    }
    if (!/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(cleaned)) {
        throw new FileValidationError('File content is not valid base64');
    }
    const bytes = Buffer.from(cleaned, 'base64');
    if (bytes.length === 0) {
        throw new FileValidationError('No file content was provided');
    }
    return bytes;
}
/**
 * Validates, uploads and records one object. Returns the bytes alongside the row so callers
 * that need them next (the schedule upload hands them to the parser) do not decode twice.
 */
export async function storeObject(input) {
    const rule = PURPOSE_RULES[input.purpose];
    if (!rule) {
        throw new FileValidationError(`Unknown file purpose: ${input.purpose}`);
    }
    const bytes = decodeUploadedFile(input.file);
    const mimeType = sniffMimeType(bytes);
    if (rule.mimeTypes && (!mimeType || !rule.mimeTypes.includes(mimeType))) {
        throw new FileValidationError(`This file is not one of the accepted types for ${input.purpose} (${rule.mimeTypes.join(', ')})`);
    }
    const isImage = mimeType?.startsWith('image/') ?? false;
    const maxBytes = isImage ? Math.min(rule.maxBytes, IMAGE_MAX_BYTES) : rule.maxBytes;
    if (bytes.length > maxBytes) {
        throw new FileValidationError(`File is ${(bytes.length / MB).toFixed(1)} MB; the limit is ${Math.round(maxBytes / MB)} MB`);
    }
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    let storageKey;
    let url;
    try {
        const uploaded = await uploadAttachmentToCloudinary(bytes, {
            folder: input.projectId ? `projects/${input.projectId}/${rule.folder}` : rule.folder,
            resourceType: isImage ? 'image' : rule.resourceType,
            tags: [input.purpose],
        });
        // The public id, not the URL: it is what addresses the object for delivery AND deletion,
        // and it survives a change of CDN hostname or delivery scheme.
        storageKey = uploaded.publicId;
        url = uploaded.secureUrl;
    }
    catch (err) {
        throw new FileStorageError(err instanceof Error ? err.message : 'Upload to storage failed');
    }
    const fileObject = await FileObjects.create({
        project_id: input.projectId,
        purpose: input.purpose,
        variant: input.variant ?? 'original',
        parent_file_id: input.parentFileId ?? null,
        storage_key: storageKey,
        original_filename: input.originalFilename,
        mime_type: mimeType ?? 'application/octet-stream',
        size_bytes: bytes.length,
        sha256,
        // AC-FIL-01 puts a malware scan between upload and `available`. There is no scanner
        // wired up yet, so nothing would ever move a file out of `scanning`.
        // shortcut: files go straight to `available`. Upgrade when a scanner exists — set
        // `scanning` here and let the scan job promote or reject.
        status: 'available',
        uploaded_by: input.uploadedBy,
    });
    return { fileObject, bytes, url };
}
/**
 * Undoes a storeObject: removes the bytes from storage, then the row. Used when the entity
 * that was meant to reference the file could not be written, so the request leaves nothing
 * behind. Storage goes first — a dangling row with no object is recoverable, a stored object
 * with no row is invisible and bills forever.
 *
 * Safe to call twice: Cloudinary treats an unknown public id as success.
 */
export async function discardObject(fileObject) {
    assertStorageKeyIsHandle(fileObject);
    const resourceType = fileObject.mime_type.startsWith('image/') ? 'image' : 'raw';
    await deleteFromCloudinary(fileObject.storage_key, resourceType);
    await FileObjects.remove(fileObject.file_id);
}
/**
 * Delivery URL for a stored object, built from its handle.
 *
 * Deliberately does NOT call assertStorageKeyIsHandle. That guard protects deletion, which
 * cannot turn a URL back into a public id; reading needs no such reversal, and a row written
 * before storage_key held a handle is still perfectly readable. Enforcing it here took down
 * every read of the owning entity — one legacy photo row 500'd a whole DPR.
 */
export function objectUrl(fileObject) {
    if (/^https?:\/\//i.test(fileObject.storage_key))
        return fileObject.storage_key;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
    if (!cloudName) {
        throw new FileStorageError('Cloudinary cloud name missing; cannot build an object URL');
    }
    const resourceType = fileObject.mime_type.startsWith('image/') ? 'image' : 'raw';
    return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${fileObject.storage_key}`;
}
/** Reads a stored object back. Used when the bytes are no longer in memory — processing a
 *  version that was queued before a restart, for instance. */
export async function fetchObjectBytes(fileObject) {
    const response = await fetch(objectUrl(fileObject));
    if (!response.ok) {
        throw new FileStorageError(`Could not read ${fileObject.original_filename} back from storage (${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
}
/**
 * storage_key holds the provider's handle (a Cloudinary public id), never a delivery URL.
 * A URL cannot be turned back into a public id reliably — raw uploads keep their extension
 * in the id, images drop it, and a `v<digits>` segment may or may not be present — so
 * guessing risks deleting the wrong object. Say exactly what is wrong instead.
 *
 * To check a deployed database before relying on this:
 *   SELECT file_id, purpose, storage_key FROM file_object WHERE storage_key ~ '^https?://';
 * Expect zero rows. Anything returned predates storage_key holding a handle and needs its
 * key rewritten to the public id before that file can be deleted through here.
 */
export function assertStorageKeyIsHandle(fileObject) {
    if (/^https?:\/\//i.test(fileObject.storage_key)) {
        throw new FileStorageError(`file_object ${fileObject.file_id} has a URL in storage_key, which must hold the ` +
            `provider handle. Rewrite it to the public id before deleting this file.`);
    }
}
export const __testing = { sniffMimeType, PURPOSE_RULES };
