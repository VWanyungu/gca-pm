import { describe, expect, it } from 'bun:test';
import {
  assertStorageKeyIsHandle,
  decodeUploadedFile,
  objectUrl,
  FileValidationError,
  __testing,
} from '../utils/objectStorage.js';

const { sniffMimeType, PURPOSE_RULES } = __testing;

const OLE2 = Buffer.from('d0cf11e0a1b11ae1', 'hex');
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
const JPEG = Buffer.from('ffd8ffe000104a46', 'hex');
const PDF = Buffer.from('%PDF-1.7\n', 'latin1');

describe('sniffMimeType', () => {
  it('recognises the formats each purpose accepts', () => {
    expect(sniffMimeType(OLE2)).toBe('application/vnd.ms-project');
    expect(sniffMimeType(PNG)).toBe('image/png');
    expect(sniffMimeType(JPEG)).toBe('image/jpeg');
    expect(sniffMimeType(PDF)).toBe('application/pdf');
  });

  it('returns null for anything else, so a purpose with a type list rejects it', () => {
    expect(sniffMimeType(Buffer.from('plain text'))).toBeNull();
    expect(sniffMimeType(Buffer.alloc(0))).toBeNull();
    // A .mpp renamed to .png is still sniffed as the compound document it is.
    expect(sniffMimeType(OLE2)).not.toBe('image/png');
  });

  it('does not read past a short buffer', () => {
    expect(sniffMimeType(Buffer.from('d0cf', 'hex'))).toBeNull();
    expect(sniffMimeType(Buffer.from('%PD', 'latin1'))).toBeNull();
  });
});

describe('decodeUploadedFile', () => {
  it('accepts a bare base64 string and a data URI alike', () => {
    const base64 = OLE2.toString('base64');
    expect(decodeUploadedFile(base64).equals(OLE2)).toBe(true);
    expect(
      decodeUploadedFile(`data:application/vnd.ms-project;base64,${base64}`).equals(OLE2),
    ).toBe(true);
  });

  it('passes buffers through untouched', () => {
    expect(decodeUploadedFile(OLE2)).toBe(OLE2);
  });

  it('rejects corrupted base64 instead of silently truncating it', () => {
    // Buffer.from drops invalid characters, which would turn this into a short, valid-looking file.
    expect(() => decodeUploadedFile('not valid base64 !!!')).toThrow(FileValidationError);
  });

  it('rejects empty content', () => {
    expect(() => decodeUploadedFile('')).toThrow(FileValidationError);
    expect(() => decodeUploadedFile('   ')).toThrow(FileValidationError);
    expect(() => decodeUploadedFile('data:application/pdf;base64,')).toThrow(FileValidationError);
  });
});

describe('purpose rules (AC-FIL-02)', () => {
  it('caps each purpose at its documented limit', () => {
    const MB = 1024 * 1024;
    expect(PURPOSE_RULES.schedule_mpp.maxBytes).toBe(50 * MB);
    expect(PURPOSE_RULES.dpr_photo.maxBytes).toBe(10 * MB);
    expect(PURPOSE_RULES.activity_attachment.maxBytes).toBe(25 * MB);
  });

  it('only accepts MS Project files for a schedule upload', () => {
    expect(PURPOSE_RULES.schedule_mpp.mimeTypes).toEqual(['application/vnd.ms-project']);
    expect(PURPOSE_RULES.dpr_photo.mimeTypes).toEqual(['image/jpeg', 'image/png']);
  });
});

describe('assertStorageKeyIsHandle', () => {
  const row = (storage_key: string) =>
    ({ file_id: 'f1', storage_key, mime_type: 'application/vnd.ms-project' }) as any;

  it('accepts a provider handle', () => {
    expect(() => assertStorageKeyIsHandle(row('projects/abc/schedules/xyz'))).not.toThrow();
    expect(() => assertStorageKeyIsHandle(row('seed/projects/mombasa/schedule-baseline.mpp'))).not.toThrow();
  });

  it('refuses a delivery URL rather than guessing the id back out of it', () => {
    // Deleting the wrong object is worse than refusing: raw ids keep their extension,
    // image ids drop it, and a v<digits> segment may or may not be there.
    expect(() => assertStorageKeyIsHandle(row('https://res.cloudinary.com/x/raw/upload/v1/a.mpp'))).toThrow(/storage_key/);
    expect(() => assertStorageKeyIsHandle(row('http://example.com/a.mpp'))).toThrow();
  });
});

describe('objectUrl', () => {
  const row = (storage_key: string, mime_type = 'image/jpeg') =>
    ({ file_id: 'f1', storage_key, mime_type }) as any;

  it('builds a delivery URL from a handle', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'gca';
    expect(objectUrl(row('projects/abc/dpr/photo1'))).toBe(
      'https://res.cloudinary.com/gca/image/upload/projects/abc/dpr/photo1',
    );
  });

  it('returns a storage_key that is already a URL instead of refusing to read it', () => {
    // Reading needs no reversal to a public id, so the delete-path guard must not apply:
    // one legacy row used to 500 every read of the DPR that owned it.
    const url = 'https://res.cloudinary.com/x/image/upload/v1/legacy.jpg';
    expect(objectUrl(row(url))).toBe(url);
  });
});
