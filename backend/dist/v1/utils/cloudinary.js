import { createHash } from 'crypto';
import 'dotenv/config';
/**
 * Uploads an attachment to Cloudinary and returns its public access URL.
 * Supports string file paths, remote URLs, base64 data URIs, or Buffers.
 */
export async function uploadAttachmentToCloudinary(file, options = {}) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET;
    const folder = options.folder ?? 'stage-activity-attachments';
    const resourceType = options.resourceType ?? 'auto';
    // 1. Try using official cloudinary SDK if present
    try {
        const cloudinaryModule = await import('cloudinary');
        const cloudinary = cloudinaryModule.v2 || cloudinaryModule.default?.v2 || cloudinaryModule;
        if (process.env.CLOUDINARY_URL) {
            cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
        }
        else if (cloudName && apiKey && apiSecret) {
            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
            });
        }
        if (Buffer.isBuffer(file)) {
            return await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({
                    folder,
                    public_id: options.publicId,
                    resource_type: resourceType,
                    tags: options.tags,
                }, (error, result) => {
                    if (error || !result) {
                        return reject(error || new Error('Cloudinary upload failed'));
                    }
                    resolve({
                        publicUrl: result.url,
                        secureUrl: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        bytes: result.bytes,
                        resourceType: result.resource_type,
                    });
                });
                stream.end(file);
            });
        }
        // String: file path, base64 data URI, or remote URL
        const result = await cloudinary.uploader.upload(file, {
            folder,
            public_id: options.publicId,
            resource_type: resourceType,
            tags: options.tags,
        });
        return {
            publicUrl: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
            resourceType: result.resource_type,
        };
    }
    catch (sdkError) {
        // 2. Fallback: Direct Cloudinary REST API upload
        if (!cloudName) {
            throw new Error('Cloudinary cloud name missing. Please set CLOUDINARY_CLOUD_NAME in your environment.');
        }
        const timestamp = Math.floor(Date.now() / 1000);
        const paramsToSign = {
            folder,
            timestamp: String(timestamp),
        };
        if (options.publicId)
            paramsToSign.public_id = options.publicId;
        let signature = '';
        if (apiSecret) {
            const sortedKeys = Object.keys(paramsToSign).sort();
            const stringToSign = sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join('&') + apiSecret;
            signature = createHash('sha1').update(stringToSign).digest('hex');
        }
        const formData = new FormData();
        if (Buffer.isBuffer(file)) {
            const blob = new Blob([new Uint8Array(file)]);
            formData.append('file', blob, options.publicId || 'attachment');
        }
        else {
            formData.append('file', file);
        }
        formData.append('folder', folder);
        formData.append('timestamp', String(timestamp));
        if (apiKey)
            formData.append('api_key', apiKey);
        if (signature)
            formData.append('signature', signature);
        if (options.publicId)
            formData.append('public_id', options.publicId);
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Cloudinary API upload failed: ${response.statusText} - ${errText}`);
        }
        const data = (await response.json());
        return {
            publicUrl: data.url,
            secureUrl: data.secure_url,
            publicId: data.public_id,
            format: data.format,
            bytes: data.bytes,
            resourceType: data.resource_type,
        };
    }
}
/**
 * Removes an object from Cloudinary by its public id. Used to undo an upload whose database
 * row could not be written, so a failed request does not leave a paid-for orphan behind.
 *
 * Signed REST call rather than the SDK: this runs on an error path, where the SDK's own
 * import-and-configure dance is one more thing that can throw.
 */
export async function deleteFromCloudinary(publicId, resourceType = 'raw') {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary credentials missing; cannot delete object');
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash('sha1')
        .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
        .digest('hex');
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, { method: 'POST', body: formData });
    if (!response.ok) {
        throw new Error(`Cloudinary delete failed: ${response.statusText} - ${await response.text()}`);
    }
    // Cloudinary answers 200 with {"result":"not found"} for an id that is already gone.
    const data = (await response.json());
    if (data.result !== 'ok' && data.result !== 'not found') {
        throw new Error(`Cloudinary delete returned "${data.result}" for ${publicId}`);
    }
}
