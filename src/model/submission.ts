/**
 * Grader Extension API Schemas
 *
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


export interface Submission { 
    id?: number;
    submitted_at?: string;
    auto_status?: Submission.AutoStatusEnum;
    manual_status?: Submission.ManualStatusEnum;
    username?: string;
    grading_score?: number;
    score_scaling?: number;
    score?: number;
    assignid?: number;
    commit_hash?: string;
    feedback_status?: Submission.FeedbackStatusEnum;
    edited?: boolean;
}
export namespace Submission {
    export type AutoStatusEnum = 'not_graded' | 'pending' | 'automatically_graded' | 'grading_failed';
    export const AutoStatusEnum = {
        NotGraded: 'not_graded' as AutoStatusEnum,
        Pending: 'pending' as AutoStatusEnum,
        AutomaticallyGraded: 'automatically_graded' as AutoStatusEnum,
        GradingFailed: 'grading_failed' as AutoStatusEnum
    };
    export type ManualStatusEnum = 'not_graded' | 'manually_graded' | 'being_edited' | 'grading_failed';
    export const ManualStatusEnum = {
        NotGraded: 'not_graded' as ManualStatusEnum,
        ManuallyGraded: 'manually_graded' as ManualStatusEnum,
        BeingEdited: 'being_edited' as ManualStatusEnum,
        GradingFailed: 'grading_failed' as ManualStatusEnum
    };
    export type FeedbackStatusEnum = 'not_generated' | 'generating' | 'generated' | 'generation_failed' | 'feedback_outdated';
    export const FeedbackStatusEnum = {
        NotGenerated: 'not_generated' as FeedbackStatusEnum,
        Generating: 'generating' as FeedbackStatusEnum,
        Generated: 'generated' as FeedbackStatusEnum,
        GenerationFailed: 'generation_failed' as FeedbackStatusEnum,
        FeedbackOutdated: 'feedback_outdated' as FeedbackStatusEnum
    };
}


