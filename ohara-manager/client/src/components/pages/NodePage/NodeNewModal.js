import React from 'react';
import PropTypes from 'prop-types';
import { Form, Field } from 'react-final-form';
import toastr from 'toastr';

import * as _ from 'utils/commonUtils';
import * as nodeApis from 'apis/nodeApis';
import { Modal } from 'common/Modal';
import { Box } from 'common/Layout';
import { FormGroup, Label } from 'common/Form';
import * as MESSAGES from 'constants/messages';
import InputField from './InputField';
import * as s from './Styles';

class NodeNewModal extends React.Component {
  static propTypes = {
    isActive: PropTypes.bool.isRequired,
    handleClose: PropTypes.func.isRequired,
    handleConfirm: PropTypes.func.isRequired,
  };

  handleModalClose = () => {
    this.props.handleClose();
  };

  onSubmit = async (values, form) => {
    const res = await nodeApis.createNode(values);
    const isSuccess = _.get(res, 'data.isSuccess', false);
    if (isSuccess) {
      form.reset();
      toastr.success(MESSAGES.NODE_CREATION_SUCCESS);
      this.props.handleConfirm();
      this.handleModalClose();
    }
  };

  render() {
    return (
      <Form
        onSubmit={this.onSubmit}
        initialValues={{}}
        render={({ handleSubmit, form, submitting, pristine }) => {
          return (
            <Modal
              title="New Ohara node"
              isActive={this.props.isActive}
              width="320px"
              handleCancel={() => {
                form.reset();
                this.handleModalClose();
              }}
              handleConfirm={handleSubmit}
              confirmBtnText="Save"
              isConfirmDisabled={submitting || pristine}
              showActions={true}
            >
              <form onSubmit={handleSubmit}>
                <Box shadow={false}>
                  <FormGroup data-testid="name">
                    <Label>Host name</Label>
                    <Field
                      name="name"
                      component={InputField}
                      width="100%"
                      placeholder="node-00"
                      data-testid="name-input"
                    />
                  </FormGroup>
                  <FormGroup data-testid="port">
                    <Label>Port</Label>
                    <Field
                      name="port"
                      component={InputField}
                      type="number"
                      min={0}
                      max={65535}
                      width="50%"
                      placeholder="1021"
                      data-testid="port-input"
                    />
                  </FormGroup>
                  <FormGroup data-testid="user">
                    <Label>User name</Label>
                    <Field
                      name="user"
                      component={InputField}
                      width="100%"
                      placeholder="admin"
                      data-testid="user-input"
                    />
                  </FormGroup>
                  <FormGroup data-testid="password">
                    <Label>Password</Label>
                    <Field
                      name="password"
                      component={InputField}
                      type="password"
                      width="100%"
                      placeholder="password"
                      data-testid="password-input"
                    />
                  </FormGroup>
                  <FormGroup data-testid="view-topology">
                    <s.TestConnectionBtn
                      text="Test connection"
                      data-testid="test-connection-button"
                      handleClick={() => {}}
                    />
                  </FormGroup>
                </Box>
              </form>
            </Modal>
          );
        }}
      />
    );
  }
}

export default NodeNewModal;
