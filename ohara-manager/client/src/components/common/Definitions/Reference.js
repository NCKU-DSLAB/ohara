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
import { omit, has, isPlainObject, isArray } from 'lodash';
import PropTypes from 'prop-types';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';

const Reference = (props) => {
  const {
    input: { name, onChange, value = {}, ...restInput },
    meta = {},
    helperText,
    disables = [],
    list = [],
    refs,
    ...rest
  } = omit(props, ['tableKeys']);

  const placeholder = 'Please select...';
  const newList = [
    { name: placeholder, tags: { displayName: placeholder } },
    ...list,
  ];

  const getDisplayValue = () => {
    if (isPlainObject(value)) {
      if (has(value, 'displayName')) {
        return value.displayName;
      } else if (has(value, 'name')) {
        return value.name;
      } else {
        return placeholder;
      }
    } else if (isArray(value) && value.length > 0) {
      const { displayName } = list.find((item) => item.name === value[0].name);
      return displayName;
    } else if (list.length === 0 || value.length === 0) {
      return placeholder;
    } else {
      return value;
    }
  };

  const hasError = (meta.error && meta.touched) || (meta.error && meta.dirty);

  const getMenuDisplayValue = (item) => {
    if (has(item, 'displayName')) {
      return item.displayName;
    } else {
      return item.name;
    }
  };

  return (
    <TextField
      {...rest}
      error={hasError}
      fullWidth
      helperText={hasError ? meta.error : helperText}
      InputProps={restInput}
      name={name}
      onChange={onChange}
      ref={refs}
      select
      value={getDisplayValue()}
    >
      {newList.map((item) => {
        const disabled = disables.includes(item.name);
        const menuDisplayValue = getMenuDisplayValue(item);
        return (
          <MenuItem
            disabled={disabled}
            key={item.name}
            value={menuDisplayValue}
          >
            {menuDisplayValue}
          </MenuItem>
        );
      })}
    </TextField>
  );
};

Reference.propTypes = {
  input: PropTypes.shape({
    name: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.object,
      PropTypes.array,
    ]).isRequired,
  }).isRequired,
  meta: PropTypes.shape({
    dirty: PropTypes.bool,
    touched: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  }),
  width: PropTypes.string,
  helperText: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  errorMessage: PropTypes.string,
  disables: PropTypes.array,
  list: PropTypes.array,
  refs: PropTypes.object,
};

export default Reference;
