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

import { PACKAGE_ROOT, KIND } from '../../const';

export const getPipelineOnlyTopicDisplayNames = (topicCells) => {
  const topicIndex = topicCells
    .filter((topicCell) => !topicCell.isShared)
    .map((topicCell) => topicCell.displayName.replace('T', ''))
    .sort((a, b) => a - b);

  if (topicIndex.length === 0) return 'T1';
  return `T${Number(topicIndex.pop()) + 1}`;
};

export const isShabondi = (className) =>
  className &&
  className.replace(PACKAGE_ROOT, '').split('.').slice(1).shift() ===
    KIND.shabondi;
