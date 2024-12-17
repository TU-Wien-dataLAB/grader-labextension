// Copyright (c) 2022, TU Wien
// All rights reserved.
//
// This source code is licensed under the BSD-style license found in the
// LICENSE file in the root directory of this source tree.

import { Lecture } from '../model/lecture';
import { request, HTTPMethod } from './request.service';

export function getAllLectures(
  complete: boolean = false,
  reload = false
): Promise<Lecture[]> {
  let url = 'api/lectures';
  if (complete) {
    const searchParams = new URLSearchParams({
      complete: String(complete)
    });
    url += '?' + searchParams;
  }
  return request<Lecture[]>(HTTPMethod.GET, url, null, reload);
}

export function updateLecture(lecture: Lecture): Promise<Lecture> {
  return request<Lecture, Lecture>(
    HTTPMethod.PUT,
    `/api/lectures/${lecture.id}`,
    lecture
  );
}

export function getLecture(
  lectureId: number,
  reload = false
): Promise<Lecture> {
  return request<Lecture>(
    HTTPMethod.GET,
    `/api/lectures/${lectureId}`,
    null,
    reload
  );
}

export function deleteLecture(lectureId: number): Promise<void> {
  return request<void>(HTTPMethod.DELETE, `/api/lectures/${lectureId}`, null);
}

export function getUsers(
  lectureId: number,
  reload: boolean = false
): Promise<{ instructors: string[]; tutors: string[]; students: string[] }> {
  return request<{
    instructors: string[];
    tutors: string[];
    students: string[];
  }>(HTTPMethod.GET, `/api/lectures/${lectureId}/users`, null, reload);
}

export async function getAllLectureSubmissions(
  lectureId: number,
  filter: 'latest' | 'best' = 'best',
  format: 'json' | 'csv' = 'csv'
): Promise<any> {
  const url = `/api/lectures/${lectureId}/submissions?filter=${filter}&format=${format}`;
  return request<any>(HTTPMethod.GET, url, null);
}
