import {
	describeManifestFileDifference,
	listManifestFiles,
	parseVersionedWorkspaceManifest,
} from '../workspace-manifest';

describe('parseVersionedWorkspaceManifest', () => {
	it('parses a valid manifest', () => {
		expect(
			parseVersionedWorkspaceManifest(JSON.stringify({ schemaVersion: 1, contentHash: 'abc123' }), {
				schemaVersion: 1,
				hashField: 'contentHash',
			}),
		).toEqual({
			schemaVersion: 1,
			hashField: 'contentHash',
			hash: 'abc123',
		});
	});

	it('returns null for invalid JSON', () => {
		expect(
			parseVersionedWorkspaceManifest('not-json', {
				schemaVersion: 1,
				hashField: 'contentHash',
			}),
		).toBeNull();
	});

	it('returns null for schema version mismatch', () => {
		expect(
			parseVersionedWorkspaceManifest(JSON.stringify({ schemaVersion: 2, contentHash: 'abc' }), {
				schemaVersion: 1,
				hashField: 'contentHash',
			}),
		).toBeNull();
	});

	it('returns null for empty hash values', () => {
		expect(
			parseVersionedWorkspaceManifest(JSON.stringify({ schemaVersion: 1, skillsHash: '' }), {
				schemaVersion: 1,
				hashField: 'skillsHash',
			}),
		).toBeNull();
	});
});

describe('parseVersionedWorkspaceManifest files', () => {
	it('returns the recorded file list', () => {
		expect(
			parseVersionedWorkspaceManifest(
				JSON.stringify({ schemaVersion: 1, skillsHash: 'abc', files: ['a/SKILL.md'] }),
				{ schemaVersion: 1, hashField: 'skillsHash' },
			),
		).toEqual({ schemaVersion: 1, hashField: 'skillsHash', hash: 'abc', files: ['a/SKILL.md'] });
	});

	it('ignores a file list that is not an array of strings', () => {
		const manifest = parseVersionedWorkspaceManifest(
			JSON.stringify({ schemaVersion: 1, skillsHash: 'abc', files: ['a', 1] }),
			{ schemaVersion: 1, hashField: 'skillsHash' },
		);

		expect(manifest).not.toHaveProperty('files');
	});
});

describe('listManifestFiles', () => {
	it('lists the bundle files relative to the manifest directory, without the manifest', () => {
		const files = new Map([
			['/root/skills/b/SKILL.md', ''],
			['/root/skills/.manifest.json', ''],
			['/root/skills/a/references/x.md', ''],
		]);

		expect(listManifestFiles(files, '/root/skills/.manifest.json')).toEqual([
			'a/references/x.md',
			'b/SKILL.md',
		]);
	});
});

describe('describeManifestFileDifference', () => {
	it('reports files that are only on one side', () => {
		expect(describeManifestFileDifference(['a.md', 'b.md'], ['b.md', 'c.md'])).toEqual({
			notInSandboxCount: 1,
			notInSandbox: ['a.md'],
			notExpectedCount: 1,
			notExpected: ['c.md'],
		});
	});

	it('reports a manifest without a file list', () => {
		expect(describeManifestFileDifference(['a.md'], undefined)).toEqual({
			manifestFileList: 'absent',
		});
	});

	it('limits the number of logged paths', () => {
		const expected = Array.from({ length: 25 }, (_, index) => `file-${index}.md`);

		const difference = describeManifestFileDifference(expected, []);

		expect(difference.notInSandboxCount).toBe(25);
		expect(difference.notInSandbox).toHaveLength(20);
	});
});
