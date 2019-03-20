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

package com.island.ohara.connector.perf

import com.island.ohara.client.kafka.WorkerClient
import com.island.ohara.common.util.CommonUtils
import com.island.ohara.kafka.connector.json.ConnectorFormatter
import com.island.ohara.testing.WithBrokerWorker
import org.junit.Test
import org.scalatest.Matchers

import scala.collection.JavaConverters._
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._
import scala.concurrent.{Await, Future}
class TestPerfDefinition extends WithBrokerWorker with Matchers {

  private[this] val workerClient = WorkerClient(testUtil().workersConnProps())

  private[this] def result[T](f: Future[T]): T = Await.result(f, 10 seconds)

  @Test
  def testSource(): Unit = {
    val response = result(
      workerClient
        .connectorValidator()
        .name(CommonUtils.randomString(5))
        .numberOfTasks(1)
        .topicName(CommonUtils.randomString(5))
        .connectorClass(classOf[PerfSource])
        .run)

    response.settings().size should not be 0
    response
      .settings()
      .asScala
      .filter(_.definition().key() == ConnectorFormatter.TOPIC_NAMES_KEY)
      .head
      .definition()
      .required() shouldBe true
    response
      .settings()
      .asScala
      .filter(_.definition().key() == ConnectorFormatter.CLASS_NAME_KEY)
      .head
      .definition()
      .required() shouldBe true
    response
      .settings()
      .asScala
      .filter(_.definition().key() == ConnectorFormatter.NUMBER_OF_TASKS_KEY)
      .head
      .definition()
      .required() shouldBe true
    response
      .settings()
      .asScala
      .filter(_.definition().key() == ConnectorFormatter.COLUMNS_KEY)
      .head
      .definition()
      .required() shouldBe false
    response
      .settings()
      .asScala
      .filter(_.definition().key() == ConnectorFormatter.WORKER_CLUSTER_NAME_KEY)
      .head
      .definition()
      .required() shouldBe false
    response
      .settings()
      .asScala
      .filter(_.definition().key() == ConnectorFormatter.NAME_KEY)
      .head
      .definition()
      .required() shouldBe true
    response.errorCount() shouldBe 0
  }
}