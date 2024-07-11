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

#ifndef API_RESP_HPP
#define API_RESP_HPP

#include "pjs/pjs.hpp"
#include "data.hpp"
#include "deframer.hpp"

namespace pipy {

//
// RESP
//

class RESP : public pjs::ObjectTemplate<RESP> {
public:
  static auto decode(const Data &data) -> pjs::Array*;
  static void encode(const pjs::Value &value, Data &data);
  static void encode(const pjs::Value &value, Data::Builder &db);

  //
  // RESP::Parser
  //

  class Parser : protected Deframer {
  public:
    Parser();

    void reset();
    void parse(Data &data);

  protected:
    virtual void on_message_start() {}
    virtual void on_message_end(const pjs::Value &value) = 0;

  private:
    enum State {
      START,
      NEWLINE,
      SIMPLE_STRING,
      ERROR_STRING,
      BULK_STRING_SIZE,
      BULK_STRING_SIZE_NEWLINE,
      BULK_STRING_SIZE_NEGATIVE,
      BULK_STRING_SIZE_NEGATIVE_CR,
      BULK_STRING_DATA,
      BULK_STRING_DATA_CR,
      INTEGER_START,
      INTEGER_POSITIVE,
      INTEGER_NEGATIVE,
      ARRAY_SIZE,
      ARRAY_SIZE_NEGATIVE,
      ARRAY_SIZE_NEGATIVE_CR,
      ERROR,
    };

    struct Level : public pjs::Pooled<Level> {
      Level* back;
      pjs::Array *array;
      int index = 0;
    };

    Level* m_stack = nullptr;
    pjs::Value m_root;
    pjs::Ref<Data> m_read_data;
    int64_t m_read_int;

    virtual auto on_state(int state, int c) -> int override;

    void push_value(const pjs::Value &value);
    void message_start();
    void message_end();
  };

  //
  // RESP::StreamParser
  //

  class StreamParser : public Parser {
  public:
    StreamParser(const std::function<void(const pjs::Value &)> &cb)
      : m_cb(cb) {}

    virtual void on_message_end(const pjs::Value &value) override {
      m_cb(value);
    }

  private:
    std::function<void(const pjs::Value &)> m_cb;
  };
};

} // namespace pipy

#endif // API_RESP_HPP
