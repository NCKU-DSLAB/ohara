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

import { merge } from 'lodash';
import { ofType } from 'redux-observable';
import { of, defer, iif, throwError, zip, from } from 'rxjs';
import {
  catchError,
  map,
  startWith,
  retryWhen,
  delay,
  concatMap,
  distinctUntilChanged,
  mergeMap,
} from 'rxjs/operators';

import { CELL_STATUS, LOG_LEVEL } from 'const';
import * as shabondiApi from 'api/shabondiApi';
import * as actions from 'store/actions';
import { getId } from 'utils/object';

export const deleteShabondi$ = (value) => {
  const { params, options = {} } = value;
  const { paperApi } = options;
  const shabondiId = getId(params);

  if (paperApi) {
    paperApi.updateElement(params.id, {
      status: CELL_STATUS.pending,
    });
  }

  return zip(
    defer(() => shabondiApi.remove(params)),
    defer(() => shabondiApi.getAll({ group: params.group })).pipe(
      map((res) => {
        if (res.data.find((shabondi) => shabondi.name === params.name))
          throw res;
        else return res.data;
      }),
    ),
  ).pipe(
    retryWhen((errors) =>
      errors.pipe(
        concatMap((value, index) =>
          iif(
            () => index > 4,
            throwError({
              data: value?.data,
              meta: value?.meta,
              title: `Try to remove shabondi: "${params.name}" failed after retry ${index} times.`,
            }),
            of(value).pipe(delay(2000)),
          ),
        ),
      ),
    ),
    mergeMap(() => {
      if (paperApi) {
        paperApi.removeElement(params.id);
      }

      return from([
        actions.setSelectedCell.trigger(null),
        actions.deleteShabondi.success({ shabondiId }),
      ]);
    }),
    startWith(actions.deleteShabondi.request({ shabondiId })),
    catchError((err) => {
      if (paperApi) {
        paperApi.updateElement(params.id, {
          status: CELL_STATUS.failed,
        });
      }

      return from([
        actions.deleteShabondi.failure(merge(err, { shabondiId })),
        actions.createEventLog.trigger({ ...err, type: LOG_LEVEL.error }),
      ]);
    }),
  );
};

export default (action$) => {
  return action$.pipe(
    ofType(actions.deleteShabondi.TRIGGER),
    map((action) => action.payload),
    distinctUntilChanged(),
    mergeMap((value) => deleteShabondi$(value)),
  );
};
