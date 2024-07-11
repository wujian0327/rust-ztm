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

#ifndef MIME_HPP
#define MIME_HPP

#include "filter.hpp"
#include "kmp.hpp"
#include "api/http.hpp"

namespace pipy {
namespace mime {

//
// MultipartDecoder
//

class MultipartDecoder : public Filter {
public:
  MultipartDecoder();

private:
  MultipartDecoder(const MultipartDecoder &r);
  ~MultipartDecoder();

  virtual auto clone() -> Filter* override;
  virtual void reset() override;
  virtual void process(Event *evt) override;
  virtual void dump(Dump &d) override;

private:
  class Multipart : public pjs::Pooled<Multipart> {
  public:
    Multipart(MultipartDecoder *decoder, const char *boundary, int length);
    ~Multipart();

    void parse(Data &data);
    void end();

  private:
    enum { MAX_HEADER_SIZE = 0x1000 };

    enum State {
      START,
      CRLF,
      DASH,
      HEADER,
      HEADER_EOL,
      BODY,
      END,
    };

    MultipartDecoder* m_decoder;
    Multipart* m_child = nullptr;
    pjs::Ref<KMP> m_kmp;
    KMP::Split* m_split;
    State m_state = START;
    Data m_header;
    pjs::Ref<http::MessageHead> m_head;

    void on_data(Data *data);
  };

  Multipart* m_current_multipart = nullptr;

  auto multipart_start(const std::string &content_type) -> Multipart*;
};

} // namespace mime
} // namespace pipy

#endif // MIME_HPP
