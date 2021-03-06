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

import * as generate from '../../../src/utils/generate';
import { KIND, CELL_STATUS } from '../../../src/const';
import { ObjectAbstract } from '../../../src/api/apiInterface/pipelineInterface';
import { fetchPipeline } from '../../utils';
import { hashByGroupAndName } from '../../../src/utils/sha';
import { NodeRequest } from '../../../src/api/apiInterface/nodeInterface';
import {
  SOURCES,
  SINKS,
} from '../../../src/api/apiInterface/connectorInterface';

const node: NodeRequest = {
  hostname: generate.serviceName(),
  port: generate.port(),
  user: generate.userName(),
  password: generate.password(),
};

/* eslint-disable @typescript-eslint/no-unused-expressions */
describe('Elements', () => {
  const sharedTopicName = generate.serviceName({ prefix: 'topic' });

  before(() => {
    cy.deleteAllServices();
    cy.createWorkspace({ node });
    cy.createSharedTopic(sharedTopicName);

    // A stream is needed for our test to ensure the Toolbox stream list is visible
    cy.uploadStreamJar();
  });

  beforeEach(() => {
    cy.deleteAllPipelines();
    cy.createPipeline();
  });

  context('Element actions', () => {
    it('should able to create connection between connector', () => {
      // Create a connection: ftpSource -> topic -> smbSink

      // Add elements
      const sourceName = generate.serviceName({ prefix: 'source' });
      const topicName = 'T1';
      const sinkName = generate.serviceName({ prefix: 'sink' });

      cy.addElement(sourceName, KIND.source, SOURCES.perf);
      cy.addElement(topicName, KIND.topic);
      cy.addElement(sinkName, KIND.sink, SINKS.smb);

      // Link them together, ftpSource -> topic
      cy.getCell(sourceName).trigger('mouseover');
      cy.cellAction(sourceName, 'link').click();
      cy.getCell(topicName).click();

      // topic -> smbSink
      cy.getCell(topicName).trigger('mouseover');
      cy.cellAction(topicName, 'link').click();
      cy.getCell(sinkName).click();

      // Should have two links
      cy.get('#paper .joint-link').should('have.length', 2);
    });

    it('should able to start a connector', () => {
      const { sourceName } = createSourceAndTopic();

      // Start the connector
      cy.getCell(sourceName).trigger('mouseover');
      cy.cellAction(sourceName, 'start').click();

      cy.get('#paper').within(() => {
        cy.findByText(sourceName).should(($source) => {
          const $container = $source.parents('.connector');
          // Should be running
          expect($container.find('.status-value').text()).to.eq(
            CELL_STATUS.running,
          );
        });
      });
    });

    it('should able to stop a connector', () => {
      const { sourceName } = createSourceAndTopic();

      // Start the connector
      cy.getCell(sourceName).trigger('mouseover');
      cy.cellAction(sourceName, 'start').click();

      cy.get('#paper').within(() => {
        cy.findByText(sourceName).should(($source) => {
          const $container = $source.parents('.connector');
          // Should be running
          expect($container.find('.status-value').text()).to.eq(
            CELL_STATUS.running,
          );
        });
      });

      // Stop the connector
      cy.cellAction(sourceName, 'stop').click();

      cy.get('#paper').within(() => {
        cy.findByText(sourceName).should(($source) => {
          const $container = $source.parents('.connector');
          // Should be stopped
          expect($container.find('.status-value').text()).to.eq(
            CELL_STATUS.stopped,
          );
        });
      });
    });

    it('should able to open Property dialog', () => {
      // Create a source
      const sourceName = generate.serviceName({ prefix: 'source' });
      cy.addElement(sourceName, KIND.source, SOURCES.perf);

      // The dialog title should not be visible
      cy.findByText(`Edit the property of ${sourceName}`).should(
        'not.be.visible',
      );

      // Open the dialog
      cy.getCell(sourceName).trigger('mouseover');
      cy.cellAction(sourceName, 'config').click();

      // Should be visible by now
      cy.findByText(`Edit the property of ${sourceName}`).should('be.visible');

      // Close the dialog so it won't interfere test cleanup
      cy.findByTestId('property-dialog').within(() => {
        cy.get('.MuiDialogTitle-root button').click();
      });
    });

    it('should able to delete an element', () => {
      const sourceName = generate.serviceName({ prefix: 'source' });
      cy.addElement(sourceName, KIND.source, SOURCES.jdbc);

      // Should exist after adding
      cy.get('#paper').findByText(sourceName).should('exist');

      // Delete it
      cy.getCell(sourceName).trigger('mouseover');
      cy.cellAction(sourceName, 'remove').click();
      cy.findByTestId('delete-dialog').within(() =>
        cy.findByText(/^delete$/i).click(),
      );

      // Should be gone after the deletion
      cy.get('#paper').findByText(sourceName).should('not.exist');
    });
  });

  // Testing different states of the Paper elements:
  // # added -> default state
  // # linked -> but not started yet
  // # pending -> starting
  // # started -> running okay
  // # failed -> started but with errors from backend
  context('Elements when added', () => {
    it('should render connector element UI', () => {
      // Use a source and sink connector for the test
      const sourceName = generate.serviceName({ prefix: 'source' });
      const sinkName = generate.serviceName({ prefix: 'sink' });
      cy.addElement(sourceName, KIND.source, SOURCES.perf);
      cy.addElement(sinkName, KIND.sink, SINKS.hdfs);

      cy.get('#paper').within(() => {
        // Ensure the system under test are exist
        cy.get('.connector').should('have.length', 2);

        // Source is property rendered
        cy.findByText(sourceName).then(($source) => {
          const $container = $source.parents('.connector');
          const type = SOURCES.perf.split('.').pop() || '';

          cy.wrap($container).within(() => {
            // Connector type
            cy.wrap($container).findByText(type).should('exist');

            // Icon and status
            expect($container.find('.icon.stopped')).to.exist;
            expect($container.find('.icon svg')).to.exist;
            cy.findByText(/^Status$/i).should('exist');
            cy.findByText(CELL_STATUS.stopped).should('exist');
          });
        });

        // Sink is property rendered
        cy.findByText(sinkName).then(($sink) => {
          const $container = $sink.parents('.connector');
          const type = SINKS.hdfs.split('.').pop() || '';

          cy.wrap($container).within(() => {
            // Connector type
            cy.wrap($container).findByText(type).should('exist');

            // Icon and status
            expect($container.find('.icon.stopped')).to.exist;
            expect($container.find('.icon svg')).to.exist;

            cy.findByText(/^Status$/i).should('exist');
            cy.findByText(CELL_STATUS.stopped).should('exist');
          });
        });
      });
    });

    it('should render stream element UI', () => {
      const streamName = generate.serviceName({ prefix: 'stream' });
      cy.addElement(streamName, KIND.stream, SOURCES.perf);

      cy.get('#paper').within(() => {
        cy.get('.stream').should('have.length', 1);

        // Stream is properly rendered
        cy.findByText(streamName)
          .should('exist')
          .then(($stream) => {
            const $container = $stream.parents('.stream');

            cy.wrap($container).within(() => {
              // Stream type, hardcoded, should find a way to making this more robust...
              cy.wrap($container).findByText('DumbStream').should('exist');

              // Icon and status
              expect($container.find('.icon.stopped')).to.exist;
              expect($container.find('.icon svg')).to.exist;

              cy.findByText(/^Status$/i).should('exist');
              cy.findByText(CELL_STATUS.stopped).should('exist');
            });
          });
      });
    });

    it('should render topic element UI', () => {
      const pipelineOnlyTopicName = 'T1';
      // Test both pipeline only and shared topic
      cy.addElement(sharedTopicName, KIND.topic);
      cy.addElement(pipelineOnlyTopicName, KIND.topic);

      cy.get('#paper').within(() => {
        cy.get('.topic').should('have.length', 2);

        // Shared topic
        cy.findByText(sharedTopicName)
          .should('exist')
          .then(($topic) => {
            const $container = $topic.parents('.topic');

            cy.wrap($container).within(() => {
              expect($container.find('.topic-status.running')).to.exist; // Status
            });
          });

        // Pipeline only topic
        cy.findByText(pipelineOnlyTopicName)
          .should('exist')
          .then(($topic) => {
            const $container = $topic.parents('.topic');

            cy.wrap($container).within(() => {
              expect($container.find('.topic-status.running')).to.exist; // Status
            });
          });
      });
    });

    it('Should name pipeline only topic correctly', () => {
      const topics = ['T1', 'T2', 'T2'];

      // TODO: refactor this to run without using `cy.addElement()` as the method
      // requires a topic name and doing too much in the background which makes our test unreal
      topics.forEach((topic: string) => cy.addElement(topic, KIND.topic));

      cy.get('#paper').within(() => {
        cy.get('.topic').should('have.length', 3);
        topics.forEach((topic) => cy.findByText(topic).should('exist'));
      });
    });

    it('should render action buttons correctly', () => {
      // Connector, stream and shabondi are all using the same template,
      // so we can test them together
      const sourceName = generate.serviceName({ prefix: 'source' });
      const sinkName = generate.serviceName({ prefix: 'sink' });
      const pipelineOnlyTopicName = 'T1';
      cy.addElement(sourceName, KIND.source, SOURCES.smb);
      cy.addElement(sinkName, KIND.sink, SINKS.ftp);
      cy.addElement(pipelineOnlyTopicName, KIND.topic);

      // Testing source
      cy.getCell(sourceName).trigger('mouseover');

      cy.get('#paper').within(() => {
        cy.findByText(sourceName)
          .should('exist')
          .then(($source) => {
            const $menu = $source.parents('.connector').find('.menu');

            // Menu should be visible when hovering
            expect($menu).to.be.visible;

            expect($menu.find('button').length).to.eq(5);

            // Available actions
            expect($menu.find('.link')).to.exist;
            expect($menu.find('.start.is-disabled')).to.exist;
            expect($menu.find('.stop.is-disabled')).to.exist;
            expect($menu.find('.config')).to.exist;
            expect($menu.find('.remove')).to.exist;

            // two actions disabled by default
            expect($menu.find('.is-disabled').length).to.eq(2);
          });
      });

      // Testing sink
      cy.getCell(sinkName).trigger('mouseover');

      cy.get('#paper').within(() => {
        cy.findByText(sinkName)
          .should('exist')
          .then(($sink) => {
            const $menu = $sink.parents('.connector').find('.menu');

            // Menu should be visible when hovering
            expect($menu).to.be.visible;

            // Available actions, notice that `link` is not available for sink connectors
            expect($menu.find('button').length).to.eq(4);

            expect($menu.find('.start.is-disabled')).to.exist;
            expect($menu.find('.stop.is-disabled')).to.exist;
            expect($menu.find('.config')).to.exist;
            expect($menu.find('.remove')).to.exist;

            // two actions disabled by default
            expect($menu.find('.is-disabled').length).to.eq(2);
          });
      });

      // Testing pipeline only topic
      cy.getCell(pipelineOnlyTopicName).trigger('mouseover');
      cy.get('#paper').within(() => {
        cy.findByText(pipelineOnlyTopicName)
          .should('exist')
          .then(($topic) => {
            const $menu = $topic.parents('.topic').find('.menu');

            // Menu should be visible when hovering
            expect($menu).to.be.visible;

            // Only two actions are available for topics
            expect($menu.find('button').length).to.eq(2);

            // Available actions
            expect($menu.find('.link')).to.exist;
            expect($menu.find('.remove')).to.exist;
          });
      });
    });
  });

  context('Elements when linked', () => {
    // We only need to test source connector
    // 1. Topic doesn't change its actions buttons when connected
    // 2. Stream, shabondi are both shared the same code as source connector
    it(`should render action buttons correctly when it's linked`, () => {
      const { sourceName } = createSourceAndTopic();

      // Testing source
      cy.getCell(sourceName).trigger('mouseover');

      cy.get('#paper').within(() => {
        cy.findByText(sourceName)
          .should('exist')
          .then(($source) => {
            const $menu = $source.parents('.connector').find('.menu');

            // Menu should be visible when hovering
            expect($menu).to.be.visible;

            expect($menu.find('button').length).to.eq(5);

            // Available actions
            expect($menu.find('.link.is-disabled')).to.exist;
            expect($menu.find('.start')).to.exist;
            expect($menu.find('.stop')).to.exist;
            expect($menu.find('.config')).to.exist;
            expect($menu.find('.remove')).to.exist;

            // only link is disabled
            expect($menu.find('.is-disabled').length).to.eq(1);
          });
      });
    });
  });

  // TODO, move this to end-to-end tests as the scenario is hard to produce in fake configurator
  context.skip('Elements when pending', () => {
    it('should disable all action buttons', () => {
      cy.server();
      cy.route({
        method: 'PUT',
        url: '/connectors/*',
        status: 200,
        response: {},
        delay: 2000,
      });

      const { sourceName } = createSourceAndTopic();
      cy.getCell(sourceName).trigger('mouseover');
      cy.cellAction(sourceName, 'start').click();

      cy.get('#paper').within(() => {
        cy.findByText(sourceName).should(($source) => {
          const $container = $source.parents('.connector');
          const $menu = $container.find('.menu');

          // Should be pending
          expect($container.find('.status-value').text()).to.eq(
            CELL_STATUS.pending,
          );

          // All action are disabled right now
          expect($menu.find('.is-disabled').length).to.eq(5);
        });
      });
    });
  });

  context('Elements when starting', () => {
    it('should disable some of the actions when running', () => {
      const { sourceName } = createSourceAndTopic();
      cy.getCell(sourceName).trigger('mouseover');
      cy.cellAction(sourceName, 'start').click();

      cy.get('#paper').within(() => {
        cy.findByText(sourceName).should(($source) => {
          const $container = $source.parents('.connector');
          const $menu = $container.find('.menu');

          // Should be running
          expect($container.find('.status-value').text()).to.eq(
            CELL_STATUS.running,
          );

          // Only stop action is not disabled
          expect($menu.find('.link.is-disabled')).to.exist;
          expect($menu.find('.start.is-disabled')).to.exist;
          expect($menu.find('.stop')).to.exist;
          expect($menu.find('.config.is-disabled')).to.exist;
          expect($menu.find('.remove.is-disabled')).to.exist;

          expect($menu.find('.is-disabled').length).to.eq(4);
        });
      });
    });
  });

  // TODO, move this to end-to-end tests as the scenario is hard to produce in fake configurator
  context.skip('Elements when failed', () => {
    it('should disable some of the actions when failed', () => {
      const { sourceName } = createSourceAndTopic();
      cy.getCell(sourceName).trigger('mouseover');
      cy.cellAction(sourceName, 'start').click();

      cy.wrap(null).then(async () => {
        const pipelineData = await fetchPipeline(
          hashByGroupAndName('workspace', 'workspace1'),
        );

        cy.server();
        cy.route('api/pipelines', {
          ...(pipelineData as any)[0],
          objects: [
            (pipelineData as any)[0].objects.map((object: ObjectAbstract) => {
              if (object.name === sourceName) {
                return {
                  ...object,
                  state: 'FAILED',
                };
              }

              return object;
            }),
          ],
        }).as('getPipelines');

        cy.reload();
        cy.wait('@getPipelines');

        cy.get('#paper').within(() => {
          cy.findByText(sourceName).should(($source) => {
            const $container = $source.parents('.connector');
            const $menu = $container.find('.menu');

            // Should be running
            expect($container.find('.status-value').text()).to.eq(
              CELL_STATUS.running,
            );

            // Only stop action is not disabled
            expect($menu.find('.link.is-disabled')).to.exist;
            expect($menu.find('.start.is-disabled')).to.exist;
            expect($menu.find('.stop')).to.exist;
            expect($menu.find('.config.is-disabled')).to.exist;
            expect($menu.find('.remove.is-disabled')).to.exist;

            expect($menu.find('.is-disabled').length).to.eq(4);
          });
        });
      });
    });
  });
});

function createSourceAndTopic() {
  // Create a Perf source and than a pipeline only topic
  const sourceName = generate.serviceName({ prefix: 'source' });
  const topicName = 'T1';
  cy.addElement(sourceName, KIND.source, SOURCES.perf);
  cy.addElement(topicName, KIND.topic);

  // Then, link Perf source and Topic together
  cy.getCell(sourceName).trigger('mouseover');
  cy.cellAction(sourceName, 'link').click();
  cy.getCell(topicName).click();

  return { sourceName, topicName };
}
