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

import { normalize } from 'normalizr';
import { merge } from 'lodash';
import { ofType } from 'redux-observable';
import { defer, of, iif, throwError, zip, from } from 'rxjs';
import {
  catchError,
  delay,
  map,
  retryWhen,
  startWith,
  distinctUntilChanged,
  mergeMap,
  concatMap,
  takeUntil,
} from 'rxjs/operators';

import * as brokerApi from 'api/brokerApi';
import * as actions from 'store/actions';
import { stopBroker } from 'observables';
import * as schema from 'store/schema';
import { getId } from 'utils/object';
import { LOG_LEVEL } from 'const';

// Note: The caller SHOULD handle the error of this action
export const stopBroker$ = (params) => {
  const brokerId = getId(params);
  return zip(
    defer(() => brokerApi.stop(params)),
    defer(() => brokerApi.get(params)).pipe(
      map((res) => {
        if (res.data?.state) throw res;
        else return res.data;
      }),
    ),
  ).pipe(
    retryWhen((errors) =>
      errors.pipe(
        concatMap((value, index) =>
          iif(
            () => index > 10,
            throwError({
              data: value?.data,
              meta: value?.meta,
              title:
                `Try to stop broker: "${params.name}" failed after retry ${index} times. ` +
                `Expected state is nonexistent, Actual state: ${value.data.state}`,
            }),
            of(value).pipe(delay(2000)),
          ),
        ),
      ),
    ),
    map(([, data]) => normalize(data, schema.broker)),
    map((normalizedData) => merge(normalizedData, { brokerId })),
    map((normalizedData) => actions.stopBroker.success(normalizedData)),
    startWith(actions.stopBroker.request({ brokerId })),
  );
};

export default (action$) =>
  action$.pipe(
    ofType(actions.stopBroker.TRIGGER),
    map((action) => action.payload),
    distinctUntilChanged(),
    mergeMap(({ values, resolve, reject }) => {
      const brokerId = getId(values);
      return stopBroker(values).pipe(
        map((data) => {
          if (resolve) resolve(data);
          const normalizedData = merge(normalize(data, schema.broker), {
            brokerId,
          });
          return actions.stopBroker.success(normalizedData);
        }),
        startWith(actions.stopBroker.request({ brokerId })),
        catchError((err) => {
          if (reject) reject(err);
          return from([
            actions.stopBroker.failure(merge(err, { brokerId: getId(values) })),
            actions.createEventLog.trigger({ ...err, type: LOG_LEVEL.error }),
          ]);
        }),
        takeUntil(action$.pipe(ofType(actions.stopBroker.CANCEL))),
      );
    }),
  );
