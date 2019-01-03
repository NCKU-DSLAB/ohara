import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import toastr from 'toastr';
import { Redirect } from 'react-router-dom';

import * as URLS from 'constants/urls';
import * as _ from 'utils/commonUtils';
import * as MESSAGES from 'constants/messages';
import * as pipelinesApis from 'apis/pipelinesApis';
import { Box } from 'common/Layout';
import { H5 } from 'common/Headings';
import { DataTable } from 'common/Table';
import { lightBlue } from 'theme/variables';
import { primaryBtn } from 'theme/btnTheme';
import { Input, Select, FormGroup, Label, Button } from 'common/Form';
import { fetchCluster } from 'apis/clusterApis';

const H5Wrapper = styled(H5)`
  margin: 0 0 30px;
  font-weight: normal;
  color: ${lightBlue};
`;

const Fieldset = styled.fieldset`
  border: none;
  position: relative;
  padding: 0;

  &:after {
    content: '';
    background-color: red;
    width: 100%;
    height: 100%;
    display: ${props => (props.disabled ? 'block' : 'none')};
    position: absolute;
    top: 0;
    left: 0;
    background: rgba(255, 255, 255, 0.5);
    cursor: not-allowed;
  }
`;

const TableWrapper = styled.div`
  display: flex;
  width: 100%;
`;

const GetTablesBtn = styled(Button)`
  align-self: flex-start;
  margin-left: 20px;
  white-space: nowrap;
`;

class PipelineJdbcSource extends React.Component {
  static propTypes = {
    hasChanges: PropTypes.bool.isRequired,
    updateHasChanges: PropTypes.func.isRequired,
    updateGraph: PropTypes.func.isRequired,
    loadGraph: PropTypes.func.isRequired,
    match: PropTypes.shape({
      isExact: PropTypes.bool,
      params: PropTypes.object,
      path: PropTypes.string,
      url: PropTypes.string,
    }).isRequired,
  };

  selectMaps = {
    databases: 'currDatabase',
    tables: 'currTable',
    writeTopics: 'currWriteTopic',
  };

  dbSchemasHeader = ['Column name', 'Column type'];

  state = {
    name: '',
    databases: [],
    currDatabase: {},
    tables: [],
    currTable: {},
    writeTopics: [],
    currWriteTopic: {},
    username: '',
    password: '',
    url: '',
    timestamp: '',
    isBtnWorking: false,
    isFormDisabled: false,
    isRedirect: false,
    pipelines: [],
  };

  componentDidMount() {
    this.fetchData();
  }

  async componentDidUpdate(prevProps) {
    const { hasChanges, match } = this.props;

    const prevSourceId = _.get(prevProps.match, 'params.connectorId', null);
    const currSourceId = _.get(match, 'params.connectorId', null);
    const isUpdate = prevSourceId !== currSourceId;

    if (hasChanges) {
      this.save();
    }

    if (isUpdate) {
      const { name, id, rules } = this.state.pipelines;

      const params = {
        name,
        rules: { ...rules, [currSourceId]: '?' },
      };

      this.updatePipeline(id, params);
    }
  }

  fetchData = () => {
    const { match } = this.props;
    const sourceId = _.get(match, 'params.connectorId', null);
    const pipelineId = _.get(match, 'params.pipelineId', null);

    if (sourceId) {
      const fetchPipelinePromise = this.fetchPipeline(pipelineId);
      const fetchClusterPromise = this.fetchCluster();

      Promise.all([fetchPipelinePromise, fetchClusterPromise]).then(() => {
        this.fetchSource(sourceId);
      });

      return;
    }

    this.fetchCluster();
    this.fetchPipeline(pipelineId);
  };

  fetchSource = async sourceId => {
    if (!sourceId) return;

    const res = await pipelinesApis.fetchSource(sourceId);
    const isSuccess = _.get(res, 'data.isSuccess', false);
    const topicId = _.get(this.props.match, 'params.topicId');

    if (topicId) {
      this.fetchTopics(topicId);
    }

    if (isSuccess) {
      const { name } = res.data.result;

      const {
        'source.timestamp.column.name': timestamp = '',
        'source.db.username': username = '',
        'source.db.password': password = '',
        'source.db.url': url = '',
        table = '{}',
        database = '{}',
      } = res.data.result.configs;

      let currTable = null;
      let tables = [];
      if (!_.isEmptyStr(table)) {
        currTable = JSON.parse(table);
        tables = [currTable];
      }

      const _db = JSON.parse(database);
      const currDatabase = this.state.databases.find(
        db => db.name === _db.name,
      );

      const hasValidProps = [username, password, url].map(x => {
        return x.length > 0;
      });

      const isFormDisabled = !hasValidProps.every(p => p === true);

      this.setState({
        name,
        isFormDisabled,
        currDatabase,
        tables,
        currTable,
        timestamp,
        password,
        username,
        url,
      });
    }
  };

  fetchPipeline = async pipelineId => {
    if (!pipelineId) return;

    const res = await pipelinesApis.fetchPipeline(pipelineId);
    const pipelines = _.get(res, 'data.result', []);

    if (!_.isEmpty(pipelines)) {
      this.setState({ pipelines });

      const sourceId = _.get(this.props.match, 'params.sourceId', null);

      if (sourceId && sourceId !== '__') {
        this.props.loadGraph(pipelines);
      }
    }
  };

  fetchRdbTables = async () => {
    const { url, username, password, currTable } = this.state;
    const res = await pipelinesApis.queryRdb({ url, user: username, password });
    const tables = _.get(res, 'data.result.tables', null);
    const _currTable = _.isEmpty(currTable) ? tables[0] : currTable;

    if (tables) {
      this.setState({ tables, currTable: _currTable });
    }
  };

  fetchCluster = async () => {
    const res = await fetchCluster();
    const databases = _.get(res, 'data.result.supportedDatabases', null);

    if (databases) {
      this.setState({ databases, currDatabase: databases[0] });
    }
  };

  handleChangeInput = ({ target: { name, value } }) => {
    this.setState({ [name]: value }, () => {
      this.props.updateHasChanges(true);
    });
  };

  handleChangeSelect = ({ target }) => {
    const { name, options, value } = target;
    const selectedIdx = options.selectedIndex;
    const { id } = options[selectedIdx].dataset;
    const current = this.selectMaps[name];
    const isTable = name.toLowerCase() === 'tables';
    const schema = isTable
      ? this.state.tables.find(table => table.name === value).schema
      : undefined;

    this.setState(
      () => {
        return {
          [current]: {
            name: value,
            id,
            schema,
          },
        };
      },
      () => {
        this.props.updateHasChanges(true);
      },
    );
  };

  handleGetTables = async e => {
    e.preventDefault();
    const { username: user, password, url } = this.state;

    this.updateIsBtnWorking(true);
    const res = await pipelinesApis.validateRdb({ user, password, url });
    this.updateIsBtnWorking(false);
    const isSuccess = _.get(res, 'data.isSuccess', false);

    if (isSuccess) {
      toastr.success(MESSAGES.TEST_SUCCESS);
      this.setState({ isFormDisabled: false });
      this.fetchRdbTables();
    }
  };

  updateIsBtnWorking = update => {
    this.setState({ isBtnWorking: update });
  };

  updatePipeline = async (id, params) => {
    const res = await pipelinesApis.updatePipeline({ id, params });
    const pipelines = _.get(res, 'data.result', []);

    if (!_.isEmpty(pipelines)) {
      this.setState({ pipelines });
      this.props.loadGraph(pipelines);
    }
  };

  save = _.debounce(async () => {
    const { match, history, updateHasChanges, isPipelineRunning } = this.props;
    const {
      name,
      currDatabase,
      currWriteTopic,
      currTable,
      timestamp,
      username,
      password,
      url,
    } = this.state;

    if (isPipelineRunning) {
      toastr.error(MESSAGES.CANNOT_UPDATE_WHILE_RUNNING_ERROR);
      updateHasChanges(false);
      return;
    }

    const sourceId = _.get(match, 'params.connectorId', null);
    const isConnectorExist = _.isNull(sourceId);
    const topics = _.isEmpty(currWriteTopic) ? [] : [currWriteTopic.topicId];

    const params = {
      name,
      schema: [],
      className: 'jdbc',
      topics,
      numberOfTasks: 1,
      configs: {
        'source.table.name': currTable.name,
        'source.db.url': url,
        'source.db.username': username,
        'source.db.password': password,
        'source.timestamp.column.name': timestamp,
        'source.schema.pattern': '',
        database: JSON.stringify(currDatabase),
        table: JSON.stringify(currTable),
      },
    };

    const res = isConnectorExist
      ? await pipelinesApis.createSource(params)
      : await pipelinesApis.updateSource({ id: sourceId, params });

    const updatedSourceId = _.get(res, 'data.result.id', null);
    updateHasChanges(false);

    if (updatedSourceId && isConnectorExist) {
      history.push(`${match.url}/${updatedSourceId}`);
    }
  }, 1000);

  render() {
    const {
      name,
      url,
      username,
      password,
      databases,
      currDatabase,
      isBtnWorking,
      tables,
      currTable,
      timestamp,
      writeTopics,
      currWriteTopic,
      isRedirect,
    } = this.state;

    if (isRedirect) {
      return <Redirect to={URLS.PIPELINE} />;
    }

    return (
      <React.Fragment>
        <Box>
          <H5Wrapper>JDBC connection</H5Wrapper>
          <Fieldset disabled={isBtnWorking}>
            <FormGroup data-testid="name">
              <Label>Name</Label>
              <Input
                name="name"
                width="100%"
                placeholder="JDBC source name"
                value={name}
                data-testid="name-input"
                handleChange={this.handleChangeInput}
              />
            </FormGroup>

            <FormGroup>
              <Label>Database</Label>
              <Select
                name="databases"
                list={databases}
                selected={currDatabase}
                width="100%"
                data-testid="dataset-select"
                handleChange={this.handleChangeSelect}
              />
            </FormGroup>

            <FormGroup>
              <Label>URL</Label>
              <Input
                name="url"
                width="100%"
                placeholder="jdbc:mysql://localhost:3030/my-db"
                value={url}
                data-testid="url-input"
                handleChange={this.handleChangeInput}
              />
            </FormGroup>

            <FormGroup>
              <Label>User name</Label>
              <Input
                name="username"
                width="100%"
                placeholder="John Doe"
                value={username}
                data-testid="username-input"
                handleChange={this.handleChangeInput}
              />
            </FormGroup>

            <FormGroup>
              <Label>Password</Label>
              <Input
                type="password"
                name="password"
                width="100%"
                placeholder="password"
                value={password}
                data-testid="password-input"
                handleChange={this.handleChangeInput}
              />
            </FormGroup>
          </Fieldset>
          <Fieldset disabled={isBtnWorking}>
            <FormGroup>
              <Label>Table</Label>

              <TableWrapper>
                <Select
                  isObject
                  name="tables"
                  list={tables}
                  selected={currTable}
                  width="100%"
                  data-testid="table-select"
                  handleChange={this.handleChangeSelect}
                />

                <GetTablesBtn
                  theme={primaryBtn}
                  text="Get tables"
                  isWorking={isBtnWorking}
                  disabled={isBtnWorking}
                  data-testid="get-tables-btn"
                  handleClick={this.handleGetTables}
                />
              </TableWrapper>
            </FormGroup>

            <FormGroup>
              <Label>Timestamp column</Label>
              <Input
                name="timestamp"
                width="100%"
                placeholder="120"
                value={timestamp}
                data-testid="timestamp-input"
                handleChange={this.handleChangeInput}
              />
            </FormGroup>

            <FormGroup>
              <Label>Write topic</Label>
              <Select
                isObject
                name="writeTopics"
                list={writeTopics}
                selected={currWriteTopic}
                width="100%"
                data-testid="write-topic-select"
                handleChange={this.handleChangeSelect}
              />
            </FormGroup>
          </Fieldset>
        </Box>

        {!_.isEmpty(currTable) && (
          <Box>
            <H5Wrapper>Database schemas</H5Wrapper>
            <DataTable headers={this.dbSchemasHeader}>
              {currTable.schema.map(({ name, dataType }, idx) => {
                return (
                  <tr key={idx}>
                    <td>{name}</td>
                    <td>{dataType}</td>
                  </tr>
                );
              })}
            </DataTable>
          </Box>
        )}
      </React.Fragment>
    );
  }
}

export default PipelineJdbcSource;
