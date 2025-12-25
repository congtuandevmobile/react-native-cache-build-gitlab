import {
    cacheManager,
    color,
    colorLink,
    logger,
    type RemoteArtifact,
    RockError,
} from "@rock-js/tools";

export type GitLabRepoDetails = {
    baseUrl: string;
    projectId: number | string;
    token: string;
    tokenHeader: "PRIVATE-TOKEN" | "JOB-TOKEN";
    packageName: string;
};

const PAGE_SIZE = 100;

type GitLabPackage = {
    id: number;
    name: string;
    version: string | null;
    package_type: "generic";
    created_at: string;
};

type GitLabPackageFile = {
    id: number;
    file_name: string;
    size: number;
    created_at: string;
};

export type GitLabArtifact = {
    packageId: number;
    fileId: number;
    name: string;
    version: string;
    sizeInBytes: number;
    createdAt: string;
    downloadUrl: string;
};

function headersFor(repo: GitLabRepoDetails) {
    return {
        [repo.tokenHeader]: repo.token,
        Accept: "application/json",
    } as Record<string, string>;
}

async function httpJson<T>(url: string, repo: GitLabRepoDetails): Promise<T> {
    const res = await fetch(url, {headers: headersFor(repo)});
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        const info = `${res.status} ${res.statusText}${body ? ` — ${body}` : ""}`;

        if (res.status === 401 || res.status === 403) {
            cacheManager.remove("gitlabToken");
            throw new RockError(
                `GitLab auth failed.\nUpdate token under ${color.bold("remoteCacheProvider")} in ${colorLink(
                    "rock.config.mjs",
                )}. Local uses ${color.bold("PRIVATE-TOKEN")}, CI uses ${color.bold("JOB-TOKEN")}.\nURL: ${colorLink(
                    url,
                )}\nError: ${info}`,
            );
        }
        if (res.status === 404) {
            throw new RockError(
                `GitLab 404.\nCheck baseUrl/projectId/packageName or token perms.\nURL: ${colorLink(url)}`,
            );
        }
        throw new RockError(`GitLab request failed: ${info}`);
    }
    return (await res.json()) as T;
}

function genericDownloadUrl(
    repo: GitLabRepoDetails,
    packageName: string,
    version: string,
    fileName: string,
) {
    const {baseUrl, projectId} = repo;
    return `${baseUrl}/api/v4/projects/${encodeURIComponent(
        String(projectId),
    )}/packages/generic/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}/${encodeURIComponent(
        fileName,
    )}`;
}

export async function fetchGitLabArtifactsByName(
    name: string | undefined,
    repo: GitLabRepoDetails,
    limit?: number,
    version?: string,
): Promise<GitLabArtifact[]> {
    if (!repo?.token) {
        throw new RockError(
            "Missing GitLab token. Valid repoDetails.token & tokenHeader pass.",
        );
    }
    const perPage = Math.min(limit ?? PAGE_SIZE, PAGE_SIZE);

    let page = 1;

    const packages: GitLabPackage[] = [];
    while (true) {
        const url =
            `${repo.baseUrl}/api/v4/projects/${encodeURIComponent(String(repo.projectId))}/packages` +
            `?package_type=generic&per_page=${perPage}&page=${page}` +
            (name ? `&package_name=${encodeURIComponent(name)}` : "");
        const chunk = await httpJson<GitLabPackage[]>(url, repo);
        if (!chunk.length) break;
        packages.push(...chunk);
        if (chunk.length < perPage) break;
        page += 1;
    }

    const artifacts: GitLabArtifact[] = [];
    for (const pkg of packages) {
        if (pkg.package_type !== "generic" || !pkg.version) continue;
        // Don't filter by version here - we'll filter by filename later

        let fPage = 1;
        while (true) {
            const filesUrl =
                `${repo.baseUrl}/api/v4/projects/${encodeURIComponent(String(repo.projectId))}` +
                `/packages/${pkg.id}/package_files?per_page=${PAGE_SIZE}&page=${fPage}`;
            const files = await httpJson<GitLabPackageFile[]>(filesUrl, repo);
            if (!files.length) break;

            for (const file of files) {
                // If version (fingerprint) is provided, filter by filename containing it
                if (version && !file.file_name.includes(version)) continue;

                artifacts.push({
                    packageId: pkg.id,
                    fileId: file.id,
                    name: pkg.name,
                    version: pkg.version,
                    sizeInBytes: file.size,
                    createdAt: file.created_at,
                    downloadUrl: genericDownloadUrl(
                        repo,
                        pkg.name,
                        pkg.version,
                        file.file_name,
                    ),
                });
            }

            if (files.length < PAGE_SIZE) break;
            fPage += 1;
        }
    }
    artifacts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return artifacts;
}

export async function deleteGitLabArtifacts(
    artifacts: GitLabArtifact[],
    repo: GitLabRepoDetails,
    artifactNameForLog?: string,
): Promise<RemoteArtifact[]> {
    const deleted: RemoteArtifact[] = [];
    try {
        for (const artifact of artifacts) {
            const url = `${repo.baseUrl}/api/v4/projects/${encodeURIComponent(
                String(repo.projectId),
            )}/packages/${artifact.packageId}/package_files/${artifact.fileId}`;

            const res = await fetch(url, {
                method: "DELETE",
                headers: headersFor(repo),
            });

            if (!res.ok) {
                logger.warn(
                    `Delete failed packageId=${artifact.packageId}, fileId=${artifact.fileId}: ${res.status} ${res.statusText}`,
                );
                continue;
            }

            deleted.push({
                name: `${artifact.name}@${artifact.version}`,
                url: artifact.downloadUrl,
                id: String(artifact.fileId),
            });
        }
        return deleted;
    } catch (error) {
        throw new RockError(
            `Failed to delete GitLab artifacts${artifactNameForLog ? ` for "${artifactNameForLog}"` : ""}`,
            {cause: error},
        );
    }
}