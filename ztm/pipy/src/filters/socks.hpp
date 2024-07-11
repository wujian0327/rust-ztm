/*
 *  Copyright (c) 2019 by flomesh.io
 *
 *  Unless prior written consent has been obtained from the copyright
 *  owner, the following shall not be allowed.
 *
 *  1. The distribution of any source codes, header files, make files,
 *     or libraries of the software.
 *
 *  2. Disclosure of any source codes pertaining to the software to any
 *     additional parties.
 *
 *  3. Alteration or removal of any notices in or on the software or
 *     within the documentation included within the software.
 *
 *  ALL SOURCE CODE AS WELL AS ALL DOCUMENTATION INCLUDED WITH THIS
 *  SOFTWARE IS PROVIDED IN AN “AS IS” CONDITION, WITHOUT WARRANTY OF ANY
 *  KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 *  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 *  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 *  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 *  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 *  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#ifndef SOCKS_HPP
#define SOCKS_HPP

#include "filter.hpp"
#include "deframer.hpp"

namespace pipy {

namespace socks {

//
// Server
//

class Server : public Filter, public Deframer {
public:

  //
  // Server::Request
  //

  struct Request : public pjs::ObjectTemplate<Request> {
    pjs::Ref<pjs::Str> id;
    pjs::Ref<pjs::Str> ip;
    pjs::Ref<pjs::Str> domain;
    int port;
  };

  Server(pjs::Function *on_connect);

private:
  Server(const Server &r);
  ~Server();

  virtual auto clone() -> Filter* override;
  virtual void reset() override;
  virtual void process(Event *evt) override;
  virtual void dump(Dump &d) override;

  enum State {
    READ_VERSION = 0,

    // SOCKS4
    READ_SOCKS4_CMD,
    READ_SOCKS4_DSTPORT,
    READ_SOCKS4_DSTIP,
    READ_SOCKS4_ID,
    READ_SOCKS4_DOMAIN,

    // SOCKS5
    READ_SOCKS5_NAUTH,
    READ_SOCKS5_AUTH,
    READ_SOCKS5_CMD,
    READ_SOCKS5_ADDR_TYPE,
    READ_SOCKS5_DOMAIN_LEN,
    READ_SOCKS5_DOMAIN,
    READ_SOCKS5_DSTIP,
    READ_SOCKS5_DSTPORT,

    STARTED,
  };

  virtual auto on_state(int state, int c) -> int override;
  virtual void on_pass(Data &data) override;

  pjs::Ref<pjs::Function> m_on_connect;
  pjs::Ref<Pipeline> m_pipeline;
  uint8_t m_buffer[256];
  uint8_t m_ip[4];
  pjs::Ref<pjs::Str> m_id;
  pjs::Ref<pjs::Str> m_domain;
  int m_port = 0;
  int m_read_ptr = 0;

  bool start(int version);
  void reply(int version, int code);
};

//
// Client
//

class Client : public Filter, public EventSource, public Deframer {
public:
  Client(const pjs::Value &target);

private:
  Client(const Client &r);
  ~Client();

  virtual auto clone() -> Filter* override;
  virtual void reset() override;
  virtual void process(Event *evt) override;
  virtual void on_reply(Event *evt) override;
  virtual auto on_state(int state, int c) -> int override;
  virtual void on_pass(Data &data) override;
  virtual void dump(Dump &d) override;

  enum State {
    STATE_INIT,
    STATE_READ_AUTH,
    STATE_READ_CONN_HEAD,
    STATE_READ_CONN_ADDR,
    STATE_CONNECTED,
  };

  pjs::Value m_target;
  pjs::Ref<Pipeline> m_pipeline;
  pjs::Ref<StreamEnd> m_eos;
  Data m_buffer;
  uint8_t m_read_buffer[256+2];
  bool m_is_started = false;

  bool start();
};

} // namespace socks
} // namespace pipy

#endif // SOCKS_HPP
