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

const fs = require('fs');

const copyJars = () => {
  fs.access('./client/cypress/fixtures/plugin/', (err) => {
    if (err) {
      fs.mkdirSync('./client/cypress/fixtures/plugin', { recursive: true });
    }
    fs.copyFile(
      '../ohara-it/build/libs/ohara-it-source.jar',
      'client/cypress/fixtures/plugin/ohara-it-source.jar',
      (err) => {
        if (err) throw err;
      },
    );
    fs.copyFile(
      '../ohara-it/build/libs/ohara-it-sink.jar',
      'client/cypress/fixtures/plugin/ohara-it-sink.jar',
      (err) => {
        if (err) throw err;
      },
    );
  });

  fs.access('./client/cypress/fixtures/stream', (err) => {
    if (err) {
      fs.mkdirSync('./client/cypress/fixtures/stream', { recursive: true });
    }
    fs.copyFile(
      '../ohara-it/build/libs/ohara-it-stream.jar',
      'client/cypress/fixtures/stream/ohara-it-stream.jar',
      (err) => {
        if (err) throw err;
      },
    );
  });
};

module.exports = copyJars;
