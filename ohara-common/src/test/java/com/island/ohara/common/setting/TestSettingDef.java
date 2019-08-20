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

package com.island.ohara.common.setting;

import com.island.ohara.common.data.Serializer;
import com.island.ohara.common.exception.OharaConfigException;
import com.island.ohara.common.json.JsonUtils;
import com.island.ohara.common.rule.SmallTest;
import com.island.ohara.common.util.CommonUtils;
import java.time.Duration;
import java.util.Arrays;
import java.util.Collections;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.Assert;
import org.junit.Test;

public class TestSettingDef extends SmallTest {

  @Test(expected = NullPointerException.class)
  public void nullKey() {
    SettingDef.builder().key(null);
  }

  @Test(expected = IllegalArgumentException.class)
  public void emptyKey() {
    SettingDef.builder().key("");
  }

  @Test(expected = NullPointerException.class)
  public void nullType() {
    SettingDef.builder().valueType(null);
  }

  @Test(expected = NullPointerException.class)
  public void nullDefaultWithString() {
    SettingDef.builder().optional((String) null);
  }

  @Test(expected = NullPointerException.class)
  public void nullDefaultWithObjectKey() {
    SettingDef.builder().optional((ObjectKey) null);
  }

  @Test(expected = NullPointerException.class)
  public void nullDefaultWithTopicKey() {
    SettingDef.builder().optional((TopicKey) null);
  }

  @Test(expected = NullPointerException.class)
  public void nullDefaultWithConnectorKey() {
    SettingDef.builder().optional((ConnectorKey) null);
  }

  @Test(expected = NullPointerException.class)
  public void nullDefaultWithDuration() {
    SettingDef.builder().optional((Duration) null);
  }

  @Test(expected = NullPointerException.class)
  public void nullDocumentation() {
    SettingDef.builder().documentation(null);
  }

  @Test(expected = IllegalArgumentException.class)
  public void emptyDocumentation() {
    SettingDef.builder().documentation("");
  }

  @Test(expected = NullPointerException.class)
  public void nullReference() {
    SettingDef.builder().reference(null);
  }

  @Test(expected = NullPointerException.class)
  public void nullGroup() {
    SettingDef.builder().group(null);
  }

  @Test(expected = IllegalArgumentException.class)
  public void emptyGroup() {
    SettingDef.builder().group("");
  }

  @Test(expected = NullPointerException.class)
  public void nullDisplay() {
    SettingDef.builder().displayName(null);
  }

  @Test(expected = IllegalArgumentException.class)
  public void emptyDisplay() {
    SettingDef.builder().displayName("");
  }

  @Test
  public void testOnlyKey() {
    String key = CommonUtils.randomString(5);
    SettingDef def = SettingDef.builder().key(key).build();
    Assert.assertEquals(key, def.key());
    Assert.assertNotNull(def.displayName());
    Assert.assertNotNull(def.documentation());
    Assert.assertNotNull(def.valueType());
    Assert.assertNotNull(def.group());
    Assert.assertNotNull(def.reference());
    // yep. the default value should be null
    Assert.assertNull(def.defaultValue());
  }

  @Test
  public void testGetterWithEditableAndDefaultValue() {
    String key = CommonUtils.randomString(5);
    SettingDef.Type type = SettingDef.Type.TABLE;
    String displayName = CommonUtils.randomString(5);
    String group = CommonUtils.randomString(5);
    SettingDef.Reference reference = SettingDef.Reference.WORKER_CLUSTER;
    int orderInGroup = 100;
    String valueDefault = CommonUtils.randomString(5);
    String documentation = CommonUtils.randomString(5);
    SettingDef def =
        SettingDef.builder()
            .key(key)
            .valueType(type)
            .displayName(displayName)
            .group(group)
            .reference(reference)
            .orderInGroup(orderInGroup)
            .optional(valueDefault)
            .documentation(documentation)
            .build();

    Assert.assertEquals(key, def.key());
    Assert.assertEquals(type, def.valueType());
    Assert.assertEquals(displayName, def.displayName());
    Assert.assertEquals(group, def.group());
    Assert.assertEquals(reference, def.reference());
    Assert.assertEquals(orderInGroup, def.orderInGroup());
    Assert.assertEquals(valueDefault, def.defaultValue());
    Assert.assertEquals(documentation, def.documentation());
    Assert.assertFalse(def.required());
    Assert.assertTrue(def.editable());
    Assert.assertFalse(def.internal());
  }

  @Test
  public void testGetterWithoutEditableAndDefaultValue() {
    String key = CommonUtils.randomString(5);
    SettingDef.Type type = SettingDef.Type.TABLE;
    String displayName = CommonUtils.randomString(5);
    String group = CommonUtils.randomString(5);
    SettingDef.Reference reference = SettingDef.Reference.WORKER_CLUSTER;
    int orderInGroup = 100;
    String documentation = CommonUtils.randomString(5);
    SettingDef def =
        SettingDef.builder()
            .key(key)
            .valueType(type)
            .displayName(displayName)
            .group(group)
            .reference(reference)
            .orderInGroup(orderInGroup)
            .optional()
            .documentation(documentation)
            .readonly()
            .internal()
            .build();

    Assert.assertEquals(key, def.key());
    Assert.assertEquals(type, def.valueType());
    Assert.assertEquals(displayName, def.displayName());
    Assert.assertEquals(group, def.group());
    Assert.assertEquals(reference, def.reference());
    Assert.assertEquals(orderInGroup, def.orderInGroup());
    Assert.assertNull(def.defaultValue());
    Assert.assertEquals(documentation, def.documentation());
    Assert.assertFalse(def.required());
    Assert.assertFalse(def.editable());
    Assert.assertTrue(def.internal());
  }

  @Test
  public void testTableChecker() {
    SettingDef settingDef =
        SettingDef.builder()
            .key(CommonUtils.randomString())
            .valueType(SettingDef.Type.TABLE)
            .tableKeys(Arrays.asList("a", "b"))
            .build();
    assertException(Exception.class, () -> settingDef.checker().accept(null));
    assertException(Exception.class, () -> settingDef.checker().accept(123));
    assertException(Exception.class, () -> settingDef.checker().accept(Collections.emptyList()));
    assertException(
        Exception.class,
        () ->
            settingDef
                .checker()
                .accept(Collections.singletonList(Collections.singletonMap("a", "c"))));
    settingDef
        .checker()
        .accept(
            PropGroups.of(
                    Collections.singletonList(
                        settingDef.tableKeys().stream()
                            .collect(Collectors.toMap(Function.identity(), Function.identity()))))
                .toJsonString());
  }

  @Test
  public void testDurationChecker() {
    SettingDef settingDef =
        SettingDef.builder()
            .key(CommonUtils.randomString())
            .valueType(SettingDef.Type.DURATION)
            .build();
    assertException(Exception.class, () -> settingDef.checker().accept(null));
    assertException(Exception.class, () -> settingDef.checker().accept(123));
    assertException(Exception.class, () -> settingDef.checker().accept(Collections.emptyList()));
    settingDef.checker().accept(Duration.ofHours(3).toString());
    settingDef.checker().accept("10 MILLISECONDS");
    settingDef.checker().accept("10 SECONDS");
  }

  @Test
  public void testSetDisplayName() {
    String displayName = CommonUtils.randomString();
    SettingDef settingDef =
        SettingDef.builder()
            .displayName(displayName)
            .key(CommonUtils.randomString())
            .valueType(SettingDef.Type.STRING)
            .build();
    Assert.assertEquals(displayName, settingDef.displayName());
  }

  @Test
  public void testPortType() {
    SettingDef s = SettingDef.builder().valueType(SettingDef.Type.PORT).key("port.key").build();
    // pass
    s.checker().accept(100);
    assertException(OharaConfigException.class, () -> s.checker().accept(-1));
    assertException(OharaConfigException.class, () -> s.checker().accept(0));
    assertException(OharaConfigException.class, () -> s.checker().accept(100000000));
  }

  @Test
  public void testTagsType() {
    SettingDef s = SettingDef.builder().valueType(SettingDef.Type.TAGS).key("tags.key").build();
    // pass
    s.checker().accept(CommonUtils.randomString());
    // empty array is illegal
    assertException(OharaConfigException.class, () -> s.checker().accept(Collections.emptyList()));
    assertException(OharaConfigException.class, () -> s.checker().accept(100000000));
  }

  @Test
  public void testSerialization() {
    SettingDef setting =
        SettingDef.builder().valueType(SettingDef.Type.TAGS).key("tags.key").build();
    SettingDef copy = (SettingDef) Serializer.OBJECT.from(Serializer.OBJECT.to(setting));
    Assert.assertEquals(setting, copy);
  }

  @Test
  public void testTopicKeysType() {
    SettingDef def =
        SettingDef.builder()
            .key(CommonUtils.randomString())
            .valueType(SettingDef.Type.TOPIC_KEYS)
            .build();
    // pass
    def.checker()
        .accept(
            JsonUtils.toString(
                Collections.singleton(
                    TopicKey.of(CommonUtils.randomString(), CommonUtils.randomString()))));
    // empty array is illegal
    assertException(OharaConfigException.class, () -> def.checker().accept("[]"));
    assertException(OharaConfigException.class, () -> def.checker().accept("{}"));
    assertException(
        OharaConfigException.class, () -> def.checker().accept(CommonUtils.randomString()));
    assertException(OharaConfigException.class, () -> def.checker().accept(100000000));
  }

  @Test
  public void testConnectorKeyType() {
    SettingDef def =
        SettingDef.builder()
            .key(CommonUtils.randomString())
            .valueType(SettingDef.Type.CONNECTOR_KEY)
            .build();
    // pass
    def.checker()
        .accept(
            JsonUtils.toString(
                ConnectorKey.of(CommonUtils.randomString(), CommonUtils.randomString())));
    // empty array is illegal
    assertException(OharaConfigException.class, () -> def.checker().accept("{}"));
    assertException(
        OharaConfigException.class, () -> def.checker().accept(CommonUtils.randomString()));
    assertException(OharaConfigException.class, () -> def.checker().accept(100000000));
  }

  @Test
  public void testDuration() {
    Duration duration = Duration.ofHours(10);
    SettingDef def =
        SettingDef.builder().key(CommonUtils.randomString()).optional(duration).build();
    Assert.assertEquals(Duration.parse(def.defaultValue()), duration);
  }

  @Test
  public void testObjectKey() {
    ObjectKey key = ObjectKey.of(CommonUtils.randomString(), CommonUtils.randomString());
    SettingDef def = SettingDef.builder().key(CommonUtils.randomString()).optional(key).build();
    Assert.assertEquals(ObjectKey.toObjectKey(def.defaultValue()), key);
  }

  @Test
  public void testTopicKey() {
    TopicKey key = TopicKey.of(CommonUtils.randomString(), CommonUtils.randomString());
    SettingDef def = SettingDef.builder().key(CommonUtils.randomString()).optional(key).build();
    Assert.assertEquals(TopicKey.toTopicKey(def.defaultValue()), key);
  }

  @Test
  public void testConnectorKey() {
    ConnectorKey key = ConnectorKey.of(CommonUtils.randomString(), CommonUtils.randomString());
    SettingDef def = SettingDef.builder().key(CommonUtils.randomString()).optional(key).build();
    Assert.assertEquals(ConnectorKey.toConnectorKey(def.defaultValue()), key);
  }
}
