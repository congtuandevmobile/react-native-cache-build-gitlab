import { RockError } from "@rock-js/tools";

import { GitLabRepoDetails } from "./artifacts";

export type DetectGitLabRepoInput = Partial<GitLabRepoDetails> & {
    baseUrl?: string;
    projectId?: number | string;
    token?: string;
    tokenHeader?: "JOB-TOKEN" | "PRIVATE-TOKEN";
};

export async function detectGitLabRepoDetails(
    override?: DetectGitLabRepoInput,
): Promise<GitLabRepoDetails> {
    const baseUrl = override?.baseUrl!;

    const projectId = override?.projectId;

    const token = override?.token;

    const tokenHeader = override?.tokenHeader!;

    const packageName = override?.packageName!;

    if (!projectId) {
        throw new RockError(
            "Missing GitLab projectId. Set GITLAB_PROJECT_ID or pass in override.",
        );
    }
    if (!token) {
        throw new RockError(
            "Missing GitLab token. Use CI_JOB_TOKEN or GITLAB_TOKEN.",
        );
    }
    return {
        baseUrl,
        projectId,
        token,
        tokenHeader,
        packageName,
    };
}