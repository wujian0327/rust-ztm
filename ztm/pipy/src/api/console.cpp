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

#include "console.hpp"
#include "data.hpp"

#include <sstream>

namespace pipy {

static Data::Producer s_dp("Console");

void Console::log(Log::Level level, const pjs::Value *values, int count) {
  if (level == Log::DEBUG && !Log::is_enabled(Log::USER)) return;
  if (Log::is_enabled(level)) {
    Data buf;
    Data::Builder db(buf, &s_dp);
    char str[100];
    db.push(str, Log::format_header(level, str, sizeof(str)));
    for (int i = 0; i < count; i++) {
      if (i > 0) db.push(' ');
      auto &v = values[i];
      if (v.is_string()) {
        db.push(v.s()->str());
      } else {
        dump(v, db);
      }
    }
    db.flush();
    Log::write(buf);
  }
}

void Console::dump(const pjs::Value &value, Data &out) {
  Data::Builder db(out, &s_dp);
  dump(value, db);
  db.flush();
}

void Console::dump(const pjs::Value &value, Data::Builder &db) {
  static const std::string s_empty("empty");
  static const std::string s_undefined("undefined");
  static const std::string s_true("true");
  static const std::string s_false("false");
  static const std::string s_null("null");
  static const std::string s_function("Function{ ");
  static const std::string s_data("Data");
  static const std::string s_omited("{ ... }");
  static const std::string s_recursive("{ ...recursive }");
  static const std::string s_comma(", ");
  static const std::string s_colon(": ");
  static const std::string s_hex_numbers("0123456789abcdef");

  pjs::Object* objs[100];
  int obj_level = 0;

  std::function<void(const pjs::Value&)> write;
  write = [&](const pjs::Value &value) {
    switch (value.type()) {
      case pjs::Value::Type::Empty: db.push(s_empty); break;
      case pjs::Value::Type::Undefined: db.push(s_undefined); break;
      case pjs::Value::Type::Boolean: db.push(value.b() ? s_true : s_false); break;
      case pjs::Value::Type::Number: {
        char str[200];
        auto len = pjs::Number::to_string(str, sizeof(str), value.n());
        db.push(str, len);
        break;
      }
      case pjs::Value::Type::String: {
        db.push('"');
        utils::escape(value.s()->str(), [&](char c) { db.push(c); });
        db.push('"');
        break;
      }
      case pjs::Value::Type::Object: {
        auto obj = value.o();
        if (!obj) {
          db.push(s_null);

        } else if (obj->is<pjs::Function>()) {
          auto m = obj->as<pjs::Function>()->method();
          db.push(s_function);
          db.push(m->name()->str());
          db.push(' ');
          db.push('}');

        } else if (obj->is<Data>()) {
          Data::Reader r(*obj->as<Data>());
          db.push(s_data);
          db.push('[');
          for (int i = 0; i < 10; i++) {
            int c = r.get();
            if (c < 0) break;
            db.push(' ');
            db.push(s_hex_numbers[0xf & (c>>4)]);
            db.push(s_hex_numbers[0xf & (c>>0)]);
          }
          if (!r.eof()) {
            int n = obj->as<Data>()->size() - 10;
            if (n == 1) {
              int c = r.get();
              db.push(' ');
              db.push(s_hex_numbers[0xf & (c>>4)]);
              db.push(s_hex_numbers[0xf & (c>>0)]);
            } else {
              char str[100];
              auto len = std::snprintf(str, sizeof(str), " ... and %d more bytes", n);
              db.push(str, len);
            }
          }
          db.push(' ');
          db.push(']');

        } else if (obj_level == sizeof(objs) / sizeof(objs[0])) {
          db.push(obj->type()->name()->str());
          db.push(s_omited);

        } else {
          bool recursive = false;
          for (int i = 0; i < obj_level; i++) {
            if (objs[i] == obj) {
              recursive = true;
              break;
            }
          }

          if (recursive) {
            db.push(obj->type()->name()->str());
            db.push(s_recursive);

          } else {
            objs[obj_level++] = obj;

            if (obj->is<pjs::Array>()) {
              auto a = obj->as<pjs::Array>();
              auto p = 0;
              bool first = true;
              auto push_empty = [&](int n) {
                db.push(s_empty);
                if (n > 1) {
                  char str[100];
                  auto len = std::snprintf(str, sizeof(str), " x %d times", n);
                  db.push(str, len);
                }
              };
              db.push('[');
              db.push(' ');
              a->iterate_all(
                [&](pjs::Value &v, int i) {
                  if (first) first = false; else db.push(s_comma);
                  if (i > p) {
                    push_empty(i - p);
                    db.push(s_comma);
                  }
                  write(v);
                  p = i + 1;
                }
              );
              int n = a->length() - p;
              if (n > 0) {
                if (!first) db.push(s_comma);
                push_empty(n);
              }
              db.push(' ');
              db.push(']');

            } else {
              db.push('{');
              db.push(' ');
              auto t = obj->type();
              bool first = true;
              for (int i = 0, n = t->field_count(); i < n; i++) {
                auto f = t->field(i);
                if (f->is_variable() || f->is_accessor()) {
                  if (first) first = false; else db.push(s_comma);
                  db.push(f->name()->str());
                  db.push(s_colon);
                  if (f->is_accessor()) {
                    pjs::Value v;
                    static_cast<pjs::Accessor*>(f)->get(obj, v);
                    write(v);
                  } else {
                    auto i = static_cast<pjs::Variable*>(f)->index();
                    write(obj->data()->at(i));
                  }
                }
              }
              obj->iterate_hash(
                [&](pjs::Str *k, pjs::Value &v) {
                  if (first) first = false; else db.push(s_comma);
                  db.push('"');
                  utils::escape(k->str(), [&](char c) { db.push(c); });
                  db.push('"');
                  db.push(s_colon);
                  write(v);
                  return true;
                }
              );
              db.push(' ');
              db.push('}');
            }

            obj_level--;
          }
        }

        break;
      }
    }
  };

  write(value);
}

} // namespace pipy

namespace pjs {

using namespace pipy;

template<> void ClassDef<Console>::init() {
  ctor();

  // console.log
  method("log", [](Context &ctx, Object *, Value &result) {
    Console::log(Log::INFO, &ctx.arg(0), ctx.argc());
  });

  // console.info
  method("info", [](Context &ctx, Object *, Value &result) {
    Console::log(Log::INFO, &ctx.arg(0), ctx.argc());
  });

  // console.debug
  method("debug", [](Context &ctx, Object *, Value &result) {
    Console::log(Log::DEBUG, &ctx.arg(0), ctx.argc());
  });

  // console.warn
  method("warn", [](Context &ctx, Object *, Value &result) {
    Console::log(Log::WARN, &ctx.arg(0), ctx.argc());
  });

  // console.error
  method("error", [](Context &ctx, Object *, Value &result) {
    Console::log(Log::ERROR, &ctx.arg(0), ctx.argc());
  });
}

} // namespace pjs
