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

#ifndef YAML_HPP
#define YAML_HPP

#include "pjs/pjs.hpp"
#include "data.hpp"

#include <functional>

namespace pipy {

//
// YAML
//

class YAML : public pjs::ObjectTemplate<YAML> {
public:
  static void parse(
    const std::string &str,
    const std::function<bool(pjs::Object*, const pjs::Value&, pjs::Value&)> &reviver,
    pjs::Value &val
  );

  static auto stringify(
    const pjs::Value &val,
    const std::function<bool(pjs::Object*, const pjs::Value&, pjs::Value&)> &replacer
  ) -> std::string;

  static void decode(
    const Data &data,
    const std::function<bool(pjs::Object*, const pjs::Value&, pjs::Value&)> &reviver,
    pjs::Value &val
  );

  static bool encode(
    const pjs::Value &val,
    const std::function<bool(pjs::Object*, const pjs::Value&, pjs::Value&)> &replacer,
    Data &data
  );

  static bool encode(
    const pjs::Value &val,
    const std::function<bool(pjs::Object*, const pjs::Value&, pjs::Value&)> &replacer,
    int space,
    Data::Builder &db
  );
};

} // namespace pipy

#endif // YAML_HPP
