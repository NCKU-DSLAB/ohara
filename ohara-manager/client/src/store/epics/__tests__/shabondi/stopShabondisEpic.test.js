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

import { of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { keyBy } from 'lodash';

import * as pipelineApi from 'api/pipelineApi';
import * as shabondiApi from 'api/shabondiApi';
import stopShabondisEpic from '../../shabondi/stopShabondisEpic';
import { entity as workspaceEntity } from 'api/__mocks__/workspaceApi';
import { entities as pipelineEntities } from 'api/__mocks__/pipelineApi';
import { entities as shabondiEntities } from 'api/__mocks__/shabondiApi';
import { getId } from 'utils/object';
import * as actions from 'store/actions';
import { ENTITY_TYPE } from 'store/schema';

jest.mock('api/pipelineApi');
jest.mock('api/shabondiApi');

const makeTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

let spyGetAllPipelines;
let spyGetAllShabondis;
let spyStopShabondi;

beforeEach(() => {
  // ensure the mock data is as expected before each test
  jest.restoreAllMocks();

  spyGetAllPipelines = jest.spyOn(pipelineApi, 'getAll').mockReturnValue(
    of({
      status: 200,
      title: 'mock get all pipelines',
      data: pipelineEntities,
    }),
  );

  spyGetAllShabondis = jest.spyOn(shabondiApi, 'getAll').mockReturnValue(
    of({
      status: 200,
      title: 'mock get all shabondis',
      data: shabondiEntities,
    }),
  );

  spyStopShabondi = jest.spyOn(shabondiApi, 'stop');
});

it('stop shabondis should be worked correctly', () => {
  makeTestScheduler().run((helpers) => {
    const { hot, expectObservable, expectSubscriptions, flush } = helpers;

    const input = '   ^-a        ';
    const expected = '--a 499ms v';
    const subs = ['   ^----------', '--^ 499ms !'];

    const action$ = hot(input, {
      a: {
        type: actions.stopShabondis.TRIGGER,
        payload: {
          values: {
            workspaceKey: {
              group: workspaceEntity.group,
              name: workspaceEntity.name,
            },
          },
        },
      },
    });
    const output$ = stopShabondisEpic(action$);

    expectObservable(output$).toBe(expected, {
      a: {
        type: actions.stopShabondis.REQUEST,
      },
      v: {
        type: actions.stopShabondis.SUCCESS,
        payload: {
          entities: {
            [ENTITY_TYPE.shabondis]: keyBy(shabondiEntities, (e) => getId(e)),
          },
          result: shabondiEntities.map((e) => getId(e)),
        },
      },
    });

    expectSubscriptions(action$.subscriptions).toBe(subs);

    flush();

    expect(spyGetAllPipelines).toHaveBeenCalledTimes(1);
    expect(spyGetAllShabondis).toHaveBeenCalledTimes(3);
    expect(spyStopShabondi).toHaveBeenCalledTimes(4);
  });
});
