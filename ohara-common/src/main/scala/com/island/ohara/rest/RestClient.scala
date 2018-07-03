package com.island.ohara.rest

import com.island.ohara.config.OharaJson
import com.island.ohara.io.CloseOnce

import scala.concurrent.duration.{Duration, _}

/**
  * A http client used to send the GET/PUT/DELETE/POST request to the target server.
  * The hostname and port should be in the configuration so the request method can take only path to compose the full http path.
  *
  * NOTED: it is not thread-safe.
  */
trait RestClient extends CloseOnce {

  /**
    * send a GET request to target server
    * @param path the resource path
    * @return (response code, response body)
    */
  def get(host: String, port: Int, path: String, timeout: Duration = RestClient.DEFAULT_REQUEST_TIMEOUT): RestResponse

  /**
    * send a DELETE request to target server
    * @param path the resource path
    * @return (response code, response body)
    */
  def delete(host: String,
             port: Int,
             path: String,
             timeout: Duration = RestClient.DEFAULT_REQUEST_TIMEOUT): RestResponse

  /**
    * send a PUT request to target server
    * @param path the resource path
    * @param body request payload in json format
    * @return (response code, response body)
    */
  def put(host: String,
          port: Int,
          path: String,
          body: OharaJson,
          timeout: Duration = RestClient.DEFAULT_REQUEST_TIMEOUT): RestResponse

  /**
    * send a POST request to target server
    * @param path the resource path
    * @param body request payload in json format
    * @return (response code, response body)
    */
  def post(host: String,
           port: Int,
           path: String,
           body: OharaJson,
           timeout: Duration = RestClient.DEFAULT_REQUEST_TIMEOUT): RestResponse

}

object RestClient {

  /**
    * Create a default impl of rest client.
    * @return a new RestClient
    */
  def apply(): RestClient = new AkkaRestClient()

  /**
    * Create a default impl of rest client.
    * @param host the target address
    * @param port the target port
    * @return a new RestClient
    */
  def apply(host: String, port: Int): BoundRestClient = new BoundRestClient() {
    private[this] val delegatee = RestClient()
    override def get(path: String, timeout: Duration): RestResponse = delegatee.get(host, port, path, timeout)

    override def delete(path: String, timeout: Duration): RestResponse = delegatee.delete(host, port, path, timeout)

    override def put(path: String, body: OharaJson, timeout: Duration): RestResponse =
      delegatee.put(host, port, path, body, timeout)

    override def post(path: String, body: OharaJson, timeout: Duration): RestResponse =
      delegatee.post(host, port, path, body, timeout)

    override def close(): Unit = delegatee.close()
  }

  /**
    * the default timeout to wait the response from rest server.
    */
  val DEFAULT_REQUEST_TIMEOUT: Duration = 10 seconds

  val HTTP_SCHEME = "http"
}

/**
  * It is similar to RestClient but the target address and port is bound. Hence, all http method won't require the
  * hostname and port again.
  * TODO: should we make BoundRestClient extend RestClient? That enables BoundRestClient do send request to different
  * node but it may confuse the user... by chia
  */
trait BoundRestClient extends AutoCloseable {

  /**
    * send a GET request to target server
    * @param path the resource path
    * @return (response code, response body)
    */
  def get(path: String, timeout: Duration = RestClient.DEFAULT_REQUEST_TIMEOUT): RestResponse

  /**
    * send a DELETE request to target server
    * @param path the resource path
    * @return (response code, response body)
    */
  def delete(path: String, timeout: Duration = RestClient.DEFAULT_REQUEST_TIMEOUT): RestResponse

  /**
    * send a PUT request to target server
    * @param path the resource path
    * @param body request payload in json format
    * @return (response code, response body)
    */
  def put(path: String, body: OharaJson, timeout: Duration = RestClient.DEFAULT_REQUEST_TIMEOUT): RestResponse

  /**
    * send a POST request to target server
    * @param path the resource path
    * @param body request payload in json format
    * @return (response code, response body)
    */
  def post(path: String, body: OharaJson, timeout: Duration = RestClient.DEFAULT_REQUEST_TIMEOUT): RestResponse
}
