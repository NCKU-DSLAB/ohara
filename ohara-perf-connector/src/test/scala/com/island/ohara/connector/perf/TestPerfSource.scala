package com.island.ohara.connector.perf
import com.island.ohara.client.ConnectorClient
import com.island.ohara.common.data.{Cell, Column, DataType, Serializer}
import com.island.ohara.common.util.ReleaseOnce
import com.island.ohara.integration.With3Brokers3Workers
import com.island.ohara.kafka.Consumer
import org.junit.{After, Test}
import org.scalatest.Matchers

import scala.collection.JavaConverters._
import scala.concurrent.duration._
class TestPerfSource extends With3Brokers3Workers with Matchers {
  private[this] val connectorClient = ConnectorClient(testUtil.workersConnProps)

  private[this] val props = PerfSourceProps(
    batch = 5,
    freq = 5 seconds
  )

  private[this] val schema: Seq[Column] = Seq(
    Column.of("a", DataType.STRING, 1),
    Column.of("b", DataType.SHORT, 2),
    Column.of("c", DataType.INT, 3),
    Column.of("d", DataType.LONG, 4),
    Column.of("e", DataType.FLOAT, 5),
    Column.of("f", DataType.DOUBLE, 6),
    Column.of("g", DataType.BOOLEAN, 7),
    Column.of("h", DataType.BYTE, 8),
    Column.of("i", DataType.BYTES, 9)
  )

  @Test
  def testNormalCase(): Unit = {
    val topicName = methodName
    val connectorName = methodName
    connectorClient
      .connectorCreator()
      .topic(topicName)
      .connectorClass(classOf[PerfSource])
      .numberOfTasks(1)
      .disableConverter()
      .name(connectorName)
      .schema(schema)
      .configs(props.toMap)
      .create()

    try {
      PerfUtil.checkConnector(testUtil, connectorName)
      val consumer =
        Consumer
          .builder()
          .brokers(testUtil.brokersConnProps)
          .offsetFromBegin()
          .topicName(topicName)
          .build(Serializer.BYTES, Serializer.ROW)
      try {
        def matchType(lhs: Class[_], dataType: DataType): Unit = {
          dataType match {
            case DataType.STRING  => lhs shouldBe classOf[String]
            case DataType.SHORT   => lhs shouldBe classOf[java.lang.Short]
            case DataType.INT     => lhs shouldBe classOf[java.lang.Integer]
            case DataType.LONG    => lhs shouldBe classOf[java.lang.Long]
            case DataType.FLOAT   => lhs shouldBe classOf[java.lang.Float]
            case DataType.DOUBLE  => lhs shouldBe classOf[java.lang.Double]
            case DataType.BOOLEAN => lhs shouldBe classOf[java.lang.Boolean]
            case DataType.BYTE    => lhs shouldBe classOf[java.lang.Byte]
            case DataType.BYTES   => lhs shouldBe classOf[Array[Byte]]
            case _                => throw new IllegalArgumentException("unsupported type in testing TestPerfSource")
          }
        }
        // it is hard to evaluate number from records in topics so we just fetch some records here.

        val records = consumer.poll(java.time.Duration.ofNanos((props.freq * 3).toNanos), props.batch)
        records.size >= props.batch shouldBe true
        records.asScala
          .map(_.value.get)
          .foreach(row => {
            row.size shouldBe schema.size
            schema.foreach(c => {
              val cell: Cell[_] = row.cell(c.order - 1)
              cell.name shouldBe c.name
              matchType(cell.value.getClass, c.dataType)
            })

          })
      } finally consumer.close()
    } finally connectorClient.delete(connectorName)
  }

  @After
  def tearDown(): Unit = ReleaseOnce.close(connectorClient)
}
