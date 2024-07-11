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

#include "ip.hpp"
#include "utils.hpp"

#include <cmath>

namespace pipy {

//
// IPAddressData
//

void IPAddressData::set_v4(uint32_t data) {
  m_data.v4 = data;
  m_is_v6 = false;
  m_str = nullptr;
}

void IPAddressData::set_v4(const uint8_t data[]) {
  m_data.v4 = (
    ((uint32_t)data[0] << 24) |
    ((uint32_t)data[1] << 16) |
    ((uint32_t)data[2] <<  8) |
    ((uint32_t)data[3] <<  0)
  );
  m_is_v6 = false;
  m_str = nullptr;
}

void IPAddressData::set_v6(const uint16_t data[]) {
  std::memcpy(m_data.v6, data, sizeof(m_data.v6));
  m_is_v6 = true;
  m_str = nullptr;
}

void IPAddressData::set_v4(pjs::Array *bytes) {
  uint8_t data[4];
  for (int i = 0; i < 4; i++) {
    pjs::Value v;
    if (bytes) bytes->get(i, v);
    data[i] = v.to_int32();
  }
  set_v4(data);
}

void IPAddressData::set_v6(pjs::Array *bytes) {
  uint16_t data[8];
  for (int i = 0; i < 16; i++) {
    pjs::Value v;
    if (bytes) bytes->get(i, v);
    if (i & 1) {
      data[i>>1] |= (uint8_t)v.to_int32();
    } else {
      data[i>>1] = (uint16_t)v.to_int32() << 8;
    }
  }
  set_v6(data);
}

bool IPAddressData::decompose_v4(uint8_t data[]) const {
  if (m_is_v6) return false;
  for (int i = 0; i < 4; i++) {
    data[i] = (m_data.v4 >> (24 - i * 8)) & 255;
  }
  return true;
}

bool IPAddressData::decompose_v6(uint16_t data[]) const {
  if (!m_is_v6) return false;
  for (int i = 0; i < 8; i++) {
    data[i] = m_data.v6[i];
  }
  return true;
}

auto IPAddressData::decompose() const -> pjs::Array* {
  if (m_is_v6) {
    auto *arr = pjs::Array::make(8);
    for (int i = 0; i < 8; i++) arr->set(i, m_data.v6[i]);
    return arr;
  } else {
    auto *arr = pjs::Array::make(4);
    uint8_t data[4];
    decompose_v4(data);
    for (int i = 0; i < 4; i++) arr->set(i, data[i]);
    return arr;
  }
}

auto IPAddressData::to_bytes() const -> pjs::Array* {
  uint8_t buf[16];
  auto len = to_bytes(buf);
  auto arr = pjs::Array::make(len);
  for (int i = 0; i < len; i++) arr->set(i, buf[i]);
  return arr;
}

auto IPAddressData::to_bytes(uint8_t buf[]) const -> size_t {
  if (m_is_v6) {
    for (int i = 0; i < 8; i++) {
      buf[i*2+0] = m_data.v6[i] >> 8;
      buf[i*2+1] = m_data.v6[i] & 0xff;
    }
    return 16;
  } else {
    decompose_v4(buf);
    return 4;
  }
}

auto IPAddressData::to_string(char *str, size_t len) const -> size_t {
  if (m_is_v6) {
    int zero_i = 0;
    int zero_n = 0;
    for (int i = 0, n = 0; i < 8; i++) {
      if (m_data.v6[i]) {
        n = 0;
      } else {
        if (++n > zero_n) {
          zero_n = n;
          zero_i = i;
        }
      }
    }

    int p = 0;

    auto write = [&](uint16_t n) {
      static char hex[] = { "0123456789abcdef" };
      if (p > 0) str[p++] = ':';
      bool nz = false;
      for (int i = 12; i >= 0; i -= 4) {
        auto h = (n >> i) & 15;
        if (nz || h) {
          str[p++] = hex[h];
          nz = true;
        }
      }
    };

    if (zero_n > 1) {
      auto z = zero_i + 1 - zero_n;
      for (int i = 0; i < z; i++) write(m_data.v6[i]);
      str[p++] = ':';
      z += zero_n;
      if (z < 8) {
        for (int i = z; i < 8; i++) write(m_data.v6[i]);
      } else {
        str[p++] = ':';
      }
    } else {
      for (int i = 0; i < 8; i++) write(m_data.v6[i]);
    }

    return p;

  } else {
    return std::snprintf(
      str, len, "%d.%d.%d.%d",
      (m_data.v4 >> 24) & 255,
      (m_data.v4 >> 16) & 255,
      (m_data.v4 >> 8 ) & 255,
      (m_data.v4 >> 0 ) & 255
    );
  }
}

auto IPAddressData::to_string() -> pjs::Str* {
  if (!m_str) {
    char str[100];
    auto len = to_string(str, sizeof(str));
    m_str = pjs::Str::make(str, len);
  }
  return m_str;
}

static inline auto get_ip4(const uint8_t ip[4]) -> uint32_t {
  return (
    ((uint32_t)ip[0] << 24) |
    ((uint32_t)ip[1] << 16) |
    ((uint32_t)ip[2] <<  8) |
    ((uint32_t)ip[3] <<  0)
  );
}

static inline auto mask_of(int bits) -> uint32_t {
  return bits >= 32 ? -1 : (1 << bits) - 1;
}

//
// IP
//

IP::IP(const std::string &str) {
  uint8_t ipv4[4];
  uint16_t ipv6[8];
  if (utils::get_ip_v4(str, ipv4)) {
    m_data.set_v4(ipv4);
  } else if (utils::get_ip_v6(str, ipv6)) {
    m_data.set_v6(ipv6);
  } else {
    throw std::runtime_error("invalid IP address notation");
  }
}

IP::IP(pjs::Array *bytes) {
  if (bytes && bytes->length() > 4) {
    m_data.set_v6(bytes);
  } else {
    m_data.set_v4(bytes);
  }
}

auto IP::to_string() const -> std::string {
  char str[100];
  auto len = m_data.to_string(str, sizeof(str));
  return std::string(str, len);
}

//
// IPMask
//

IPMask::IPMask(pjs::Str *cidr) : m_cidr(cidr) {
  char str[100];
  if (cidr->size() >= sizeof(str)) {
    throw std::runtime_error("string too long for CIDR notation");
  }

  std::strcpy(str, cidr->c_str());
  if (char *p = std::strchr(str, '/')) {
    *p++ = '\0';
    m_bitmask = std::atoi(p);
  } else {
    m_bitmask = 0;
  }

  uint8_t ipv4[4];
  uint16_t ipv6[8];

  if (utils::get_ip_v4(str, ipv4)) {
    if (m_bitmask < 0 || m_bitmask > 32) throw std::runtime_error("IPv4 CIDR mask out of range");
    m_ip_full.set_v4(ipv4);
  } else if (utils::get_ip_v6(str, ipv6)) {
    if (m_bitmask < 0 || m_bitmask > 128) throw std::runtime_error("IPv6 CIDR mask out of range");
    m_ip_full.set_v6(ipv6);
  } else {
    throw std::runtime_error("invalid CIDR notation");
  }

  init_mask();
}

IPMask::IPMask(int mask, uint32_t ipv4)
  : m_bitmask(mask)
{
  m_ip_full.set_v4(ipv4);
  init_mask();
}

IPMask::IPMask(int mask, uint8_t ipv4[])
  : m_bitmask(mask)
{
  m_ip_full.set_v4(ipv4);
  init_mask();
}

IPMask::IPMask(int mask, uint16_t ipv6[])
  : m_bitmask(mask)
{
  m_ip_full.set_v6(ipv6);
  init_mask();
}

IPMask::IPMask(int mask, pjs::Array *bytes)
  : m_bitmask(mask)
{
  if (bytes && bytes->length() > 4) {
    m_ip_full.set_v6(bytes);
  } else {
    m_ip_full.set_v4(bytes);
  }
  init_mask();
}

auto IPMask::hostmask() -> pjs::Str* {
  if (!m_hostmask) {
    if (m_ip_full.is_v6()) {
      uint16_t data[8];
      for (int i = 0; i < 8; i++) data[i] = ~m_ip_mask.v6()[i];
      m_hostmask = IPAddressData(data).to_string();
    } else {
      m_hostmask = IPAddressData(~m_ip_mask.v4()).to_string();
    }
  }
  return m_hostmask;
}

auto IPMask::broadcast() -> pjs::Str* {
  if (!m_broadcast) {
    if (m_ip_full.is_v6()) {
      uint16_t data[8];
      for (int i = 0; i < 8; i++) data[i] = m_ip_base.v6()[i] | ~m_ip_mask.v6()[i];
      m_broadcast = IPAddressData(data).to_string();
    } else {
      m_broadcast = IPAddressData(m_ip_base.v4() | ~m_ip_mask.v4()).to_string();
    }
  }
  return m_broadcast;
}

auto IPMask::size() const -> double {
  if (m_ip_full.is_v6()) {
    return std::pow(2, 128 - m_bitmask);
  } else {
    return 1u << (32 - m_bitmask);
  }
}

auto IPMask::first() -> pjs::Str* {
  if (!m_first) {
    if (m_ip_full.is_v6()) {
      uint16_t data[8];
      for (int i = 0; i < 7; i++) data[i] = m_ip_base.v6()[i];
      data[7] |= (~m_ip_mask.v6()[7] & 1);
      m_first = IPAddressData(data).to_string();
    } else {
      m_first = IPAddressData(m_ip_base.v4() | (~m_ip_mask.v4() & 1)).to_string();
    }
  }
  return m_first;
}

auto IPMask::last() -> pjs::Str* {
  if (!m_last) {
    if (m_ip_full.is_v6()) {
      uint16_t data[8];
      for (int i = 0; i < 7; i++) data[i] = m_ip_base.v6()[i] | ~m_ip_mask.v6()[i];
      auto mask = ~m_ip_mask.v6()[7];
      data[7] = m_ip_base.v6()[7] | (mask & (mask - 1));
      m_last = IPAddressData(data).to_string();
    } else {
      auto mask = ~m_ip_mask.v4();
      m_last = IPAddressData(m_ip_base.v4() | (mask & (mask - 1))).to_string();
    }
  }
  return m_last;
}

bool IPMask::contains(pjs::Str *addr) {
  if (m_ip_full.is_v6()) {
    uint16_t data[8];
    if (!utils::get_ip_v6(addr->str(), data)) {
      return false;
    }
    for (int i = 0; i < 8; i++) {
      if ((data[i] & m_ip_mask.v6()[i]) != m_ip_base.v6()[i]) {
        return false;
      }
    }
    return true;
  } else {
    uint8_t ip[4];
    if (!utils::get_ip_v4(addr->str(), ip)) {
      return false;
    }
    return (get_ip4(ip) & m_ip_mask.v4()) == m_ip_base.v4();
  }
}

auto IPMask::next() -> pjs::Str* {
  char str[100];
  if (m_ip_full.is_v6()) {
    uint64_t mask = (
      ((uint64_t)m_ip_mask.v6()[4] << 48) |
      ((uint64_t)m_ip_mask.v6()[5] << 32) |
      ((uint64_t)m_ip_mask.v6()[6] << 16) |
      ((uint64_t)m_ip_mask.v6()[7] <<  0)
    );
    if (m_next == ~mask) return pjs::Str::empty;
    auto n = m_next++;
    uint16_t data[8];
    m_ip_base.decompose_v6(data);
    data[4] |= n >> 48;
    data[5] |= n >> 32;
    data[6] |= n >> 16;
    data[7] |= n >>  0;
    return pjs::Str::make(str, IPAddressData(data).to_string(str, sizeof(str)));
  } else {
    if (m_next == ~m_ip_mask.v4()) return pjs::Str::empty;
    auto n = m_next++;
    return pjs::Str::make(str, IPAddressData(m_ip_base.v4() | n).to_string(str, sizeof(str)));
  }
}

void IPMask::init_mask() {
  if (m_ip_full.is_v6()) {
    uint16_t mask[8];
    uint16_t base[8];
    for (int i = 0; i < 8; i++) {
      int n = std::min(m_bitmask - i * 16, 16);
      int m = (n <= 0 ? 0 : (mask_of(n) << (16 - n)));
      mask[i] = m;
      base[i] = m_ip_full.v6()[i] & m;
    }
    m_ip_mask.set_v6(mask);
    m_ip_base.set_v6(base);
  } else {
    m_ip_mask.set_v4(mask_of(m_bitmask) << (32 - m_bitmask));
    m_ip_base.set_v4(m_ip_full.v4() & m_ip_mask.v4());
  }
}

//
// IPEndpoint
//

IPEndpoint::IPEndpoint(IP *addr, Protocol proto)
  : protocol(proto)
  , ip(addr)
{
}

IPEndpoint::IPEndpoint(IP *addr, int p, Protocol proto)
  : protocol(proto)
  , ip(addr)
  , port(p)
{
}

IPEndpoint::IPEndpoint(const std::string &addr, Protocol proto)
  : protocol(proto)
{
  std::string host;
  if (!utils::get_host_port(addr, host, port)) host = addr;
  ip = IP::make(host);
}

IPEndpoint::IPEndpoint(const std::string &addr, int p, Protocol proto)
  : protocol(proto)
  , port(p)
{
  ip = IP::make(addr);
}

} // namespace pipy

namespace pjs {

using namespace pipy;

//
// IP
//

template<> void ClassDef<IP>::init() {
  ctor([](Context &ctx) -> Object* {
    Str *str;
    Array *bytes;
    try {
      if (ctx.get(0, str)) {
        return IP::make(str->str());
      } else if (ctx.get(0, bytes)) {
        return IP::make(bytes);
      } else {
        ctx.error_argument_type(0, "a string or an array");
        return nullptr;
      }
    } catch (std::runtime_error &err) {
      ctx.error(err);
      return nullptr;
    }
  });

  accessor("version", [](Object *obj, Value &ret) { ret.set(obj->as<IP>()->version()); });

  method("decompose", [](Context &ctx, Object *obj, Value &ret) {
    ret.set(obj->as<IP>()->data().decompose());
  });

  method("toString", [](Context &ctx, Object *obj, Value &ret) {
    ret.set(obj->as<IP>()->data().to_string());
  });

  method("toBytes", [](Context &ctx, Object *obj, Value &ret) {
    ret.set(obj->as<IP>()->data().to_bytes());
  });
}

template<> void ClassDef<Constructor<IP>>::init() {
  super<Function>();
  ctor();

  method("isV4", [](Context &ctx, Object *obj, Value &ret) {
    Str *str;
    if (!ctx.arguments(1, &str)) return;
    uint8_t ip[4];
    ret.set(utils::get_ip_v4(str->str(), ip));
  });

  method("isV6", [](Context &ctx, Object *obj, Value &ret) {
    Str *str;
    if (!ctx.arguments(1, &str)) return;
    uint16_t ip[8];
    ret.set(utils::get_ip_v6(str->str(), ip));
  });
}

//
// IPMask
//

template<> void ClassDef<IPMask>::init() {
  ctor([](Context &ctx) -> Object* {
    int mask;
    Array *bytes;
    Str *cidr;
    try {
      if (ctx.get(0, cidr)) {
        return IPMask::make(cidr);
      } else if (ctx.get(0, mask)) {
        if (ctx.get(1, bytes)) {
          return IPMask::make(mask, bytes);
        } else {
          ctx.error_argument_type(1, "an array");
          return nullptr;
        }
      } else {
        ctx.error_argument_type(0, "a number or a string");
        return nullptr;
      }
    } catch (std::runtime_error &err) {
      ctx.error(err);
      return nullptr;
    }
  });

  accessor("version",   [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->version()); });
  accessor("ip",        [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->ip()); });
  accessor("bitmask",   [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->bitmask()); });
  accessor("base",      [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->base()); });
  accessor("mask",      [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->mask()); });
  accessor("hostmask",  [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->hostmask()); });
  accessor("broadcast", [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->broadcast()); });
  accessor("size",      [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->size()); });
  accessor("first",     [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->first()); });
  accessor("last",      [](Object *obj, Value &ret) { ret.set(obj->as<IPMask>()->last()); });

  method("decompose", [](Context &ctx, Object *obj, Value &ret) {
    ret.set(obj->as<IPMask>()->decompose());
  });

  method("toBytes", [](Context &ctx, Object *obj, Value &ret) {
    ret.set(obj->as<IPMask>()->to_bytes());
  });

  method("contains", [](Context &ctx, Object *obj, Value &ret) {
    Str *addr;
    if (!ctx.arguments(1, &addr)) return;
    ret.set(obj->as<IPMask>()->contains(addr));
  });

  method("next", [](Context &ctx, Object *obj, Value &ret) {
    ret.set(obj->as<IPMask>()->next());
  });
}

template<> void ClassDef<Constructor<IPMask>>::init() {
  super<Function>();
  ctor();
}

//
// IPEndpoint
//

template<> void EnumDef<IPEndpoint::Protocol>::init() {
  define(IPEndpoint::Protocol::tcp, "tcp");
  define(IPEndpoint::Protocol::udp, "udp");
}

template<> void ClassDef<IPEndpoint>::init() {
  ctor([](Context &ctx) -> Object* {
    Str *addr = nullptr;
    IP *ip = nullptr;
    int port;
    EnumValue<IPEndpoint::Protocol> protocol;
    try {
      if (!ctx.get(0, addr) && !ctx.get(0, ip)) {
        ctx.error_argument_type(0, "a string or an IP instance");
        return nullptr;
      }
      if (ctx.get(1, port)) {
        if (port < 0 || port > 65535) {
          ctx.error("port number out of range");
          return nullptr;
        }
        if (!ctx.check(2, protocol, IPEndpoint::Protocol::tcp)) return nullptr;
        if (addr) {
          return IPEndpoint::make(addr->str(), port, protocol);
        } else {
          return IPEndpoint::make(ip, port, protocol);
        }
      } else {
        if (!ctx.check(1, protocol, IPEndpoint::Protocol::tcp)) return nullptr;
        if (addr) {
          return IPEndpoint::make(addr->str(), protocol);
        } else {
          return IPEndpoint::make(ip, protocol);
        }
      }
    } catch (std::runtime_error &err) {
      ctx.error(err);
      return nullptr;
    }
  });

  field<EnumValue<IPEndpoint::Protocol>>("protocol", [](IPEndpoint *obj) { return &obj->protocol; });
  field<Ref<IP>>("ip", [](IPEndpoint *obj) { return &obj->ip; });
  field<int>("port", [](IPEndpoint *obj) { return &obj->port; });
}

template<> void ClassDef<Constructor<IPEndpoint>>::init() {
  super<Function>();
  ctor();
}

} // namespace pjs
