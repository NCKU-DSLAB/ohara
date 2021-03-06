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

package oharastream.ohara.it.client

import oharastream.ohara.client.configurator.NodeApi
import oharastream.ohara.it.category.ClientGroup
import oharastream.ohara.it.{ContainerPlatform, WithRemoteConfigurator}
import org.junit.Test
import org.junit.experimental.categories.Category
import org.scalatest.matchers.should.Matchers._

import scala.concurrent.ExecutionContext.Implicits.global

@Category(Array(classOf[ClientGroup]))
class TestListNode(platform: ContainerPlatform) extends WithRemoteConfigurator(platform: ContainerPlatform) {
  @Test
  def test(): Unit = {
    val services =
      result(NodeApi.access.hostname(configuratorHostname).port(configuratorPort).list()).flatMap(_.services)
    services should not be Seq.empty
    services.find(_.name == NodeApi.CONFIGURATOR_SERVICE_NAME) should not be None
  }
}
