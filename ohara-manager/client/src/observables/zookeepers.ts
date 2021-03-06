/*
 * Copyright 2019 is-land
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defer, throwError, zip } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { retryBackoff } from 'backoff-rxjs';
import { ObjectKey } from 'api/apiInterface/basicInterface';
import { SERVICE_STATE } from 'api/apiInterface/clusterInterface';
import * as zookeeperApi from 'api/zookeeperApi';
import { RETRY_CONFIG } from 'const';
import { isServiceRunning } from './utils';

export function createZookeeper(values: any) {
  return defer(() => zookeeperApi.create(values)).pipe(map((res) => res.data));
}

export function fetchZookeeper(values: ObjectKey) {
  return defer(() => zookeeperApi.get(values)).pipe(map((res) => res.data));
}

export function startZookeeper(key: ObjectKey) {
  return zip(
    // attempt to start at intervals
    defer(() => zookeeperApi.start(key)),
    // wait until the service is running
    defer(() => zookeeperApi.get(key)).pipe(
      map((res) => {
        if (!isServiceRunning(res)) throw res;
        return res.data;
      }),
    ),
  ).pipe(
    map(([, data]) => data),
    // retry every 2 seconds, up to 10 times
    retryBackoff(RETRY_CONFIG),
    catchError((error) =>
      throwError({
        data: error?.data,
        meta: error?.meta,
        title:
          `Try to start zookeeper: "${key.name}" failed after retry ${RETRY_CONFIG.maxRetries} times. ` +
          `Expected state: ${SERVICE_STATE.RUNNING}, Actual state: ${error.data.state}`,
      }),
    ),
  );
}

export function stopZookeeper(key: ObjectKey) {
  return zip(
    // attempt to stop at intervals
    defer(() => zookeeperApi.stop(key)),
    // wait until the service is not running
    defer(() => zookeeperApi.get(key)).pipe(
      map((res) => {
        if (res.data?.state) throw res;
        return res.data;
      }),
    ),
  ).pipe(
    map(([, data]) => data),
    // retry every 2 seconds, up to 10 times
    retryBackoff({
      ...RETRY_CONFIG,
      shouldRetry: (error) => {
        const errorCode = error?.data?.error?.code;
        if (errorCode?.match(/NoSuchElementException$/)) {
          return false;
        }
        return true;
      },
    }),
    catchError((error) =>
      throwError({
        data: error?.data,
        meta: error?.meta,
        title:
          `Try to stop zookeeper: "${key.name}" failed after retry ${RETRY_CONFIG.maxRetries} times. ` +
          `Expected state is nonexistent, Actual state: ${error.data.state}`,
      }),
    ),
  );
}

export function deleteZookeeper(key: ObjectKey) {
  return defer(() => zookeeperApi.remove(key));
}
