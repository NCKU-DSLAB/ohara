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

package oharastream.ohara.client.configurator

import java.util.Objects

import oharastream.ohara.client.Enum
import oharastream.ohara.common.annotations.Optional
import oharastream.ohara.common.setting.{ObjectKey, SettingDef}
import oharastream.ohara.common.util.CommonUtils
import spray.json.DefaultJsonProtocol._
import spray.json.{JsString, JsValue, RootJsonFormat}

import scala.concurrent.{ExecutionContext, Future}

object VolumeApi {
  val KIND: String = SettingDef.Reference.VOLUME.name().toLowerCase

  final case class Creation(
    override val group: String,
    override val name: String,
    nodeNames: Set[String],
    path: String,
    override val tags: Map[String, JsValue]
  ) extends BasicCreation {
    override def raw: Map[String, JsValue] = CREATION_FORMAT.write(this).asJsObject.fields
  }
  implicit val CREATION_FORMAT: JsonRefiner[Creation] =
    rulesOfKey[Creation]
      .format(jsonFormat5(Creation))
      .nullToEmptyObject(TAGS_KEY)
      .build

  final case class Updating(
    nodeNames: Option[Set[String]],
    path: Option[String],
    override val tags: Option[Map[String, JsValue]]
  ) extends BasicUpdating {
    override def raw: Map[String, JsValue] = UPDATING_FORMAT.write(this).asJsObject.fields
  }

  implicit val UPDATING_FORMAT: RootJsonFormat[Updating] =
    JsonRefinerBuilder[Updating].format(jsonFormat3(Updating)).build

  abstract sealed class VolumeState(val name: String) extends Serializable
  object VolumeState extends Enum[VolumeState] {
    case object RUNNING extends VolumeState("RUNNING")
  }

  implicit val VOLUME_STATE_FORMAT: RootJsonFormat[VolumeState] = new RootJsonFormat[VolumeState] {
    override def read(json: JsValue): VolumeState = VolumeState.forName(json.convertTo[String].toUpperCase)
    override def write(obj: VolumeState): JsValue = JsString(obj.name)
  }

  final case class Volume(
    override val group: String,
    override val name: String,
    nodeNames: Set[String],
    path: String,
    state: Option[VolumeState],
    error: Option[String],
    override val tags: Map[String, JsValue],
    override val lastModified: Long
  ) extends Data {
    override def kind: String = KIND

    override def raw: Map[String, JsValue] = VOLUME_FORMAT.write(this).asJsObject.fields
  }

  implicit val VOLUME_FORMAT: RootJsonFormat[Volume] =
    rulesOfKey[Volume]
      .format(jsonFormat8(Volume))
      .rejectEmptyArray("nodeNames")
      .nullToEmptyObject(TAGS_KEY)
      .build

  trait Request {
    protected var group: String                          = GROUP_DEFAULT
    protected var name: String                           = CommonUtils.randomString(10)
    private[this] var nodeNames: Option[Set[String]]     = None
    private[this] var path: Option[String]               = None
    private[this] var tags: Option[Map[String, JsValue]] = None

    @Optional("default is random name")
    def name(name: String): Request = {
      this.name = CommonUtils.requireNonEmpty(name)
      this
    }

    @Optional("default is \"default\"")
    def group(group: String): Request = {
      this.group = CommonUtils.requireNonEmpty(group)
      this
    }

    @Optional("default is \"default\" and random name")
    def key(key: ObjectKey): Request = {
      this.group(key.group())
      this.name(key.name())
    }

    def path(path: String): Request = {
      this.path = Some(CommonUtils.requireNonEmpty(path))
      this
    }

    @Optional("default is empty")
    def nodeNames(nodeNames: Set[String]): Request = {
      this.nodeNames = Some(Objects.requireNonNull(nodeNames))
      this
    }

    @Optional("default is empty")
    def tags(tags: Map[String, JsValue]): Request = {
      this.tags = Some(Objects.requireNonNull(tags))
      this
    }

    def creation: Creation =
      CREATION_FORMAT.read(
        CREATION_FORMAT.write(
          Creation(
            group = CommonUtils.requireNonEmpty(group),
            name = CommonUtils.requireNonEmpty(name),
            nodeNames = nodeNames.getOrElse(Set.empty),
            path = CommonUtils.requireNonEmpty(path.orNull),
            tags = tags.getOrElse(Map.empty)
          )
        )
      )

    def updating: Updating =
      UPDATING_FORMAT.read(
        UPDATING_FORMAT.write(
          Updating(
            nodeNames = nodeNames,
            path = path,
            tags = tags
          )
        )
      )

    /**
      * generate the POST request
      * @param executionContext thread pool
      * @return created data
      */
    def create()(implicit executionContext: ExecutionContext): Future[Volume]

    /**
      * generate the PUT request
      * @param executionContext thread pool
      * @return updated/created data
      */
    def update()(implicit executionContext: ExecutionContext): Future[Volume]
  }

  class Access private[configurator]
      extends oharastream.ohara.client.configurator.Access[Creation, Updating, Volume](KIND) {
    def request: Request = new Request {
      override def create()(implicit executionContext: ExecutionContext): Future[Volume] = post(creation)
      override def update()(implicit executionContext: ExecutionContext): Future[Volume] =
        put(ObjectKey.of(group, name), updating)
    }
  }

  def access: Access = new Access
}
