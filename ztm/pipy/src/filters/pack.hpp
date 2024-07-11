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

#ifndef PACK_HPP
#define PACK_HPP

#include "filter.hpp"
#include "data.hpp"
#include "timer.hpp"
#include "options.hpp"

#include <chrono>
#include <memory>

namespace pipy {

//
// Pack
//

class Pack : public Filter {
public:
  struct Options : public pipy::Options {
    double timeout = 5;
    double vacancy = 0.5;
    double interval = 5;
    pjs::Ref<pjs::Str> prefix;
    pjs::Ref<pjs::Str> postfix;
    pjs::Ref<pjs::Str> separator;

    Options() {}
    Options(pjs::Object *options, const char *base_name = nullptr);
  };

  Pack(int batch_size, const Options &options);

private:
  Pack(const Pack &r);
  ~Pack();

  virtual auto clone() -> Filter* override;
  virtual void reset() override;
  virtual void process(Event *evt) override;
  virtual void dump(Dump &d) override;

  int m_batch_size;
  int m_message_starts = 0;
  int m_message_ends = 0;
  Options m_options;
  pjs::Ref<pjs::Object> m_head;
  pjs::Ref<Data> m_prefix;
  pjs::Ref<Data> m_postfix;
  pjs::Ref<Data> m_separator;
  pjs::Ref<Data> m_buffer;
  Timer m_timer;
  bool m_timer_scheduled = false;
  double m_last_input_time;
  double m_last_flush_time;

  void flush(MessageEnd *end);
  void schedule_timeout();
  void check_timeout();
};

} // namespace pipy

#endif // PACK_HPP
