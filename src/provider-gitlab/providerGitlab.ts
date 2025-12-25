import type {RemoteArtifact, RemoteBuildCache} from "@rock-js/tools";

import {
    deleteGitLabArtifacts,
    fetchGitLabArtifactsByName,
    type GitLabRepoDetails,
} from "./artifacts.js";
import {detectGitLabRepoDetails} from "./config.js";

function parseRockArtifact(artifactName?: string): { fingerprint?: string } {
    if (!artifactName) return {};
    const maybe = artifactName.split("-").pop()!;
    if (/^[a-f0-9]{40}$/.test(maybe)) return {fingerprint: maybe};
    return {};
}

export class GitLabBuildCache implements RemoteBuildCache {
    name = "GitLab";
    repoDetails: GitLabRepoDetails | null = null;

    constructor(config?: {
        baseUrl: string;
        projectId: number | string;
        token: string;
        tokenHeader: "JOB-TOKEN" | "PRIVATE-TOKEN";
        packageName: string;
    }) {
        if (config) {
            const token = process.env.CI_JOB_TOKEN;

            if (!token) {
                throw new Error(
                    "GitLab token is required. Set CI_JOB_TOKEN (CI) or GITLAB_PRIVATE_TOKEN/PRIVATE_TOKEN (local).",
                );
            }
            this.repoDetails = {
                packageName: config.packageName,
                baseUrl: config.baseUrl,
                projectId: config.projectId,
                token: config.token,
                tokenHeader: config.tokenHeader,
            };
        }
    }

    async getRepoDetails(): Promise<GitLabRepoDetails> {
        if (!this.repoDetails) {
            this.repoDetails = await detectGitLabRepoDetails();
        }
        return this.repoDetails;
    }

    async list({
                   artifactName,
                   limit,
               }: {
        artifactName?: string;
        limit?: number;
    }): Promise<RemoteArtifact[]> {
        const repo = await this.getRepoDetails();

        const {fingerprint} = parseRockArtifact(artifactName);

        const artifacts = await fetchGitLabArtifactsByName(
            repo.packageName,
            repo,
            limit,
            fingerprint,
        );

        return artifacts.map((artifact) => ({
            name: `${artifact.name}@${artifact.version}`,
            url: artifact.downloadUrl,
            id: `${artifact.packageId}:${artifact.fileId}`,
        }));
    }

    async download({
                       artifactName,
                   }: {
        artifactName: string;
    }): Promise<Response> {
        const repo = await this.getRepoDetails();

        // const { name, version } = parseName(artifactName);

        const {fingerprint} = parseRockArtifact(artifactName);

        if (!fingerprint) throw new Error("artifactName is required");
        const list = await fetchGitLabArtifactsByName(
            repo.packageName,
            repo,
            1,
            fingerprint,
        );
        if (list.length === 0) {
            throw new Error(
                `No GitLab artifact found for "${artifactName}"${fingerprint ? ` (version=${fingerprint})` : ""}`,
            );
        }
        const url = list[0].downloadUrl;
        return fetch(url, {
            headers: {
                [repo.tokenHeader]: repo.token,
                "Accept-Encoding": "identity",
            } as any,
            redirect: "follow",
        });
    }

    async delete({
                     artifactName,
                     limit,
                     skipLatest,
                 }: {
        artifactName: string;
        limit?: number;
        skipLatest?: boolean;
    }): Promise<RemoteArtifact[]> {
        const repo = await this.getRepoDetails();
        const {fingerprint} = parseRockArtifact(artifactName);
        const artifacts = await fetchGitLabArtifactsByName(
            repo.packageName,
            repo,
            limit,
            fingerprint,
        );
        if (artifacts.length === 0) {
            throw new Error(
                `No GitLab artifact found for "${artifactName}"${fingerprint ? ` (version=${fingerprint})` : ""}`,
            );
        }
        const list = skipLatest ? artifacts.slice(1) : artifacts;
        return deleteGitLabArtifacts(list, repo, artifactName);
    }

    async upload(): Promise<
        RemoteArtifact & {
        getResponse: (
            buffer: Buffer | ((baseUrl: string) => Buffer),
            contentType?: string | undefined,
        ) => Response;
    }
    > {
        throw new Error("Uploading via RemoteBuildCache is not yet implemented.");
    }
}

export const providerGitLab =
    (options?: {
        baseUrl: string;
        projectId: number;
        token: string;
        tokenHeader: "PRIVATE-TOKEN" | "JOB-TOKEN";
        packageName: string;
    }) =>
        (): RemoteBuildCache =>
            new GitLabBuildCache(options);