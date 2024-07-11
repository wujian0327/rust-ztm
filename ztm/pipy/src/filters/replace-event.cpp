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

#include "replace-event.hpp"
#include "data.hpp"

namespace pipy {

ReplaceEvent::ReplaceEvent(Event::Type type, pjs::Object *replacement)
  : Replace(replacement)
  , m_type(type)
{
}

ReplaceEvent::ReplaceEvent(const ReplaceEvent &r)
  : Replace(r)
  , m_type(r.m_type)
{
}

ReplaceEvent::~ReplaceEvent()
{
}

void ReplaceEvent::dump(Dump &d) {
  Filter::dump(d);
  switch (m_type) {
    case Event::Type::Data: d.name = "replaceData"; break;
    case Event::Type::MessageStart: d.name = "replaceMessageStart"; break;
    case Event::Type::MessageEnd: d.name = "replaceMessageEnd"; break;
    case Event::Type::StreamEnd: d.name = "replaceStreamEnd"; break;
    default: break;
  }
}

auto ReplaceEvent::clone() -> Filter* {
  return new ReplaceEvent(*this);
}

void ReplaceEvent::handle(Event *evt) {
  if (int(m_type) < 0 || evt->type() == m_type) {
    if (!Replace::callback(evt)) return;
  } else {
    Replace::pass(evt);
  }
}

} // namespace pipy
