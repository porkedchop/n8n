import { isRecord } from '@n8n/utils/is-record';
import { dirname, relative } from 'node:path/posix';

export const WORKSPACE_MANIFEST_FILE = '.manifest.json';

/** Number of differing paths to include in a log entry. */
const MAX_LOGGED_FILE_PATHS = 20;

export interface VersionedWorkspaceManifest<THashField extends string = string> {
	schemaVersion: number;
	hashField: THashField;
	hash: string;
	/** Bundle file paths relative to the manifest directory. Older manifests do not have them. */
	files?: string[];
}

interface ParseVersionedWorkspaceManifestOptions<THashField extends string> {
	schemaVersion: number;
	hashField: THashField;
}

/** Parse a versioned workspace manifest and validate its hash field. */
export function parseVersionedWorkspaceManifest<const THashField extends string>(
	raw: string,
	options: ParseVersionedWorkspaceManifestOptions<THashField>,
): VersionedWorkspaceManifest<THashField> | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!isRecord(parsed)) return null;
	if (parsed.schemaVersion !== options.schemaVersion) return null;

	const hash = parsed[options.hashField];
	if (typeof hash !== 'string' || hash.length === 0) return null;

	const files = parsed.files;
	return {
		schemaVersion: options.schemaVersion,
		hashField: options.hashField,
		hash,
		...(Array.isArray(files) && files.every((file) => typeof file === 'string') ? { files } : {}),
	};
}

/** List the bundle files that a manifest records, relative to the manifest directory. */
export function listManifestFiles(files: Map<string, string>, manifestPath: string): string[] {
	const manifestDir = dirname(manifestPath);
	return Array.from(files.keys())
		.filter((path) => path !== manifestPath)
		.map((path) => relative(manifestDir, path))
		.sort();
}

/**
 * Describe how the files of an expected bundle differ from the files that a
 * sandbox manifest records. Used in debug logs to explain a stale bundle.
 */
export function describeManifestFileDifference(
	expectedFiles: string[],
	manifestFiles: string[] | undefined,
): Record<string, unknown> {
	if (!manifestFiles) return { manifestFileList: 'absent' };

	const expected = new Set(expectedFiles);
	const recorded = new Set(manifestFiles);
	const notInSandbox = expectedFiles.filter((file) => !recorded.has(file));
	const notExpected = manifestFiles.filter((file) => !expected.has(file));
	return {
		notInSandboxCount: notInSandbox.length,
		notInSandbox: notInSandbox.slice(0, MAX_LOGGED_FILE_PATHS),
		notExpectedCount: notExpected.length,
		notExpected: notExpected.slice(0, MAX_LOGGED_FILE_PATHS),
	};
}
