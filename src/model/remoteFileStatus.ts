/**
 * Grader Extension API Schemas
 *
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


export interface RemoteFileStatus { 
    status: RemoteFileStatus.StatusEnum;
}
export namespace RemoteFileStatus {
    export type StatusEnum = 'UP_TO_DATE' | 'DIVERGENT' | 'PULL_NEEDED' | 'PUSH_NEEDED' | 'NO_REMOTE_REPO';
    export const StatusEnum = {
        UpToDate: 'UP_TO_DATE' as StatusEnum,
        Divergent: 'DIVERGENT' as StatusEnum,
        PullNeeded: 'PULL_NEEDED' as StatusEnum,
        PushNeeded: 'PUSH_NEEDED' as StatusEnum,
        NoRemoteRepo: 'NO_REMOTE_REPO' as StatusEnum
    };
}

