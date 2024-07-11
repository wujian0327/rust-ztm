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

#ifndef DEFRAMER_HPP
#define DEFRAMER_HPP

#include "data.hpp"

namespace pipy {

//
// Deframer
//

class Deframer {
public:
  auto state() const -> int { return m_state; }
  void reset(int state = 0);
  void deframe(Data &data);
  void read(size_t size, void *buffer);
  void read(size_t size, Data *data);
  void read(size_t size, pjs::Array *array);
  void pass(size_t size);
  void pass_all(bool enable);
  void need_flush() { m_need_flush = true; }

protected:
  virtual auto on_state(int state, int c) -> int = 0;
  virtual void on_pass(Data &data) {}

private:
  int m_state = 0;
  bool m_passing = false;
  bool m_need_flush = false;
  size_t m_read_length = 0;
  size_t m_read_pointer = 0;
  uint8_t* m_read_buffer = nullptr;
  pjs::Ref<Data> m_read_data;
  pjs::Ref<pjs::Array> m_read_array;
  Data m_output_buffer;

  void flush();
};

} // namespace pipy

#endif // DEFRAMER_HPP
