/**
 * Grader Extension API Schemas
 *
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { AssignmentSettings } from './assignmentSettings';


export interface Assignment { 
    id?: number;
    name?: string;
    status?: Assignment.StatusEnum;
    points?: number;
    settings?: AssignmentSettings;
}
export namespace Assignment {
    export type StatusEnum = 'created' | 'pushed' | 'released' | 'complete';
    export const StatusEnum = {
        Created: 'created' as StatusEnum,
        Pushed: 'pushed' as StatusEnum,
        Released: 'released' as StatusEnum,
        Complete: 'complete' as StatusEnum
    };
}


