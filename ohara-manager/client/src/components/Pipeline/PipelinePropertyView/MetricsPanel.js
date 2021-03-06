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

import React from 'react';
import PropTypes from 'prop-types';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import SignalCellularAltIcon from '@material-ui/icons/SignalCellularAlt';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';

import PropertyField from './PipelinePropertyViewField';
import { Wrapper } from './MetricsPanelStyles';
import * as hooks from 'hooks';

const MetricsPanel = (props) => {
  const { isMetricsOn, currentCellName } = props;
  const [isExpanded, setIsExpanded] = React.useState(false);
  const objects = hooks.usePipelineObjects();

  const findByCellName = ({ name }) => name === currentCellName;
  const metrics = objects.find(findByCellName)?.nodeMetrics || {};
  const hasMetrics = Object.keys(metrics).some(
    (key) => metrics[key].meters.length > 0,
  );

  if (!hasMetrics || !isMetricsOn) return null;

  return (
    <Wrapper>
      <ExpansionPanel
        data-testid="metrics-panel"
        defaultExpanded={true}
        expanded={isExpanded}
      >
        <ExpansionPanelSummary
          expandIcon={<ExpandMoreIcon />}
          onClick={() => setIsExpanded((prevState) => !prevState)}
        >
          <SignalCellularAltIcon fontSize="small" />
          <Typography className="section-title" variant="h5">
            Metrics
          </Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>
          {Object.keys(metrics)
            .sort()
            .map((key) => {
              return (
                <React.Fragment key={key}>
                  <Typography variant="h6">{key}</Typography>
                  {metrics[key].meters.map((meter, index) => {
                    const { document, value, unit } = meter;
                    return (
                      <PropertyField
                        key={index}
                        label={document}
                        slot={
                          <Typography
                            className="metrics-unit"
                            component="span"
                            variant="body2"
                          >
                            {unit}
                          </Typography>
                        }
                        value={value}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
        </ExpansionPanelDetails>
      </ExpansionPanel>
    </Wrapper>
  );
};

MetricsPanel.propTypes = {
  isMetricsOn: PropTypes.bool.isRequired,
  currentCellName: PropTypes.string.isRequired,
};

export default MetricsPanel;
