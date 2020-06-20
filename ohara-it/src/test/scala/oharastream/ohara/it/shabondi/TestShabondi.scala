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

package oharastream.ohara.it.shabondi

import com.typesafe.scalalogging.Logger
import oharastream.ohara.client.configurator.ShabondiApi.ShabondiClusterInfo
import oharastream.ohara.client.configurator.TopicApi.TopicInfo
import oharastream.ohara.client.configurator.{
  BrokerApi,
  ClusterInfo,
  ClusterState,
  ContainerApi,
  ShabondiApi,
  TopicApi,
  ZookeeperApi
}
import oharastream.ohara.common.setting.{ObjectKey, TopicKey}
import oharastream.ohara.common.util.CommonUtils
import oharastream.ohara.it.{ContainerPlatform, WithRemoteConfigurator}
import oharastream.ohara.metrics.BeanChannel
import org.junit.{Before, Test}
import org.scalatest.matchers.should.Matchers._

import scala.concurrent.ExecutionContext.Implicits.global

class TestShabondi(platform: ContainerPlatform) extends WithRemoteConfigurator(platform: ContainerPlatform) {
  private[this] val log          = Logger(classOf[TestShabondi])
  private[this] val zkApi        = ZookeeperApi.access.hostname(configuratorHostname).port(configuratorPort)
  private[this] val bkApi        = BrokerApi.access.hostname(configuratorHostname).port(configuratorPort)
  private[this] val containerApi = ContainerApi.access.hostname(configuratorHostname).port(configuratorPort)
  private[this] val topicApi     = TopicApi.access.hostname(configuratorHostname).port(configuratorPort)
  private[this] val shabondiApi  = ShabondiApi.access.hostname(configuratorHostname).port(configuratorPort)

  private[this] var bkKey: ObjectKey = _

  @Before
  def setup(): Unit = {
    // create zookeeper cluster
    log.info("create zkCluster...start")
    val zkCluster = result(
      zkApi.request.key(serviceKeyHolder.generateClusterKey()).nodeNames(Set(nodeNames.head)).create()
    )
    result(zkApi.start(zkCluster.key))
    assertCluster(
      () => result(zkApi.list()),
      () => result(containerApi.get(zkCluster.key).map(_.flatMap(_.containers))),
      zkCluster.key
    )
    log.info("create zkCluster...done")

    // create broker cluster
    log.info("create bkCluster...start")
    val bkCluster = result(
      bkApi.request
        .key(serviceKeyHolder.generateClusterKey())
        .zookeeperClusterKey(zkCluster.key)
        .nodeNames(Set(nodeNames.head))
        .create()
    )
    bkKey = bkCluster.key
    result(bkApi.start(bkCluster.key))
    assertCluster(
      () => result(bkApi.list()),
      () => result(containerApi.get(bkCluster.key).map(_.flatMap(_.containers))),
      bkCluster.key
    )
    log.info("create bkCluster...done")
  }

  @Test
  def testStartAndStopShabondiSource(): Unit = {
    val topic1 = startTopic()

    // we make sure the broker cluster exists again (for create topic)
    assertCluster(
      () => result(bkApi.list()),
      () => result(containerApi.get(bkKey).map(_.flatMap(_.containers))),
      bkKey
    )
    log.info(s"assert broker cluster [$bkKey]...done")

    // ----- create Shabondi Source
    val shabondiSource: ShabondiApi.ShabondiClusterInfo =
      createShabondiService(ShabondiApi.SHABONDI_SOURCE_CLASS, topic1.key)
    log.info(s"shabondi creation [$shabondiSource]...done")

    // assert Shabondi Source cluster info
    val clusterInfo = result(shabondiApi.get(shabondiSource.key))
    clusterInfo.shabondiClass shouldBe ShabondiApi.SHABONDI_SOURCE_CLASS_NAME
    clusterInfo.sourceToTopics shouldBe Set(topic1.key)
    clusterInfo.state shouldBe None
    clusterInfo.error shouldBe None

    assertStartAndStop(ShabondiApi.SHABONDI_SOURCE_CLASS, shabondiSource)
  }

  @Test
  def testStartAndStopShabondiSink(): Unit = {
    val topic1 = startTopic()

    // we make sure the broker cluster exists again (for create topic)
    assertCluster(
      () => result(bkApi.list()),
      () => result(containerApi.get(bkKey).map(_.flatMap(_.containers))),
      bkKey
    )
    log.info(s"assert broker cluster [$bkKey]...done")

    // ----- create Shabondi Sink
    val shabondiSink: ShabondiApi.ShabondiClusterInfo =
      createShabondiService(ShabondiApi.SHABONDI_SINK_CLASS, topic1.key)
    log.info(s"shabondi creation [$shabondiSink]...done")

    // assert Shabondi Sink cluster info
    val clusterInfo = result(shabondiApi.get(shabondiSink.key))
    clusterInfo.shabondiClass shouldBe ShabondiApi.SHABONDI_SINK_CLASS_NAME
    clusterInfo.sinkFromTopics shouldBe Set(topic1.key)
    clusterInfo.state shouldBe None
    clusterInfo.error shouldBe None

    assertStartAndStop(ShabondiApi.SHABONDI_SINK_CLASS, shabondiSink)
  }

  private[this] def startTopic(): TopicInfo = {
    val topic = TopicKey.of("default", CommonUtils.randomString(5))
    val topicInfo = result(
      topicApi.request.key(topic).brokerClusterKey(bkKey).create()
    )
    result(topicApi.start(topicInfo.key))
    log.info(s"start topic [$topic]...done")
    topicInfo
  }

  private[this] def createShabondiService(shabondiClass: Class[_], topicKey: TopicKey): ShabondiClusterInfo = {
    val request = shabondiApi.request
      .key(serviceKeyHolder.generateClusterKey())
      .brokerClusterKey(bkKey)
      .nodeName(nodeNames.head)
      .shabondiClass(shabondiClass.getName)
      .clientPort(CommonUtils.availablePort())
    shabondiClass match {
      case ShabondiApi.SHABONDI_SOURCE_CLASS => request.sourceToTopics(Set(topicKey))
      case ShabondiApi.SHABONDI_SINK_CLASS   => request.sinkFromTopics(Set(topicKey))
    }
    result(request.create())
  }

  private[this] def assertStartAndStop(shabondiClass: Class[_], clusterInfo: ShabondiClusterInfo): Unit = {
    // ---- Start Shabondi service
    result(shabondiApi.start(clusterInfo.key))
    await(() => {
      val resultInfo = result(shabondiApi.get(clusterInfo.key))
      resultInfo.state.contains(ClusterState.RUNNING)
    })

    { // assert Shabondi Source cluster info
      val resultInfo = result(shabondiApi.get(clusterInfo.key))
      resultInfo.shabondiClass shouldBe shabondiClass.getName
      resultInfo.nodeNames shouldBe Set(nodeNames.head)
      resultInfo.aliveNodes shouldBe Set(nodeNames.head)
      resultInfo.deadNodes shouldBe Set.empty
    }

    testJmx(clusterInfo)

    // ---- Stop Shabondi service
    result(shabondiApi.stop(clusterInfo.key))
    await(() => {
      val clusters = result(shabondiApi.list())
      !clusters.map(_.key).contains(clusterInfo.key) ||
      clusters.find(_.key == clusterInfo.key).get.state.isEmpty
    })

    { // assert Shabondi Source cluster info
      val resultInfo = result(shabondiApi.get(clusterInfo.key))
      resultInfo.state shouldBe None
      resultInfo.nodeNames shouldBe Set(nodeNames.head)
      resultInfo.aliveNodes shouldBe Set.empty
      resultInfo.deadNodes shouldBe Set.empty
    }
  }

  private[this] def testJmx(cluster: ClusterInfo): Unit =
    cluster.nodeNames.foreach(
      node =>
        await(
          () =>
            try BeanChannel.builder().hostname(node).port(cluster.jmxPort).build().nonEmpty()
            catch {
              // the jmx service may be not ready.
              case _: Throwable =>
                false
            }
        )
    )
}
