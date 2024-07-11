#include <pipy/nmi.h>
#include <stdlib.h>

struct pipeline_state {
  pjs_value start;
  pjs_value body;
};

static void pipeline_init(pipy_pipeline ppl, void **user_ptr) {
  *user_ptr = calloc(1, sizeof(struct pipeline_state));
}

static void pipeline_free(pipy_pipeline ppl, void *user_ptr) {
  struct pipeline_state *state = (struct pipeline_state *)user_ptr;
  pjs_free(state->start);
  pjs_free(state->body);
  free(user_ptr);
}

static void pipeline_process(pipy_pipeline ppl, void *user_ptr, pjs_value evt) {
  struct pipeline_state *state = (struct pipeline_state *)user_ptr;
  if (pipy_is_MessageStart(evt)) {
    if (!state->start) {
      state->start = pjs_hold(evt);
      state->body = pjs_hold(pipy_Data_new(0, 0));
    }
  } else if (pipy_is_Data(evt)) {
    if (state->start) {
      pipy_Data_push(state->body, evt);
    }
  } else if (pipy_is_MessageEnd(evt)) {
    if (state->start) {
      pjs_free(state->start);
      pjs_free(state->body);
      state->start = 0;
      state->body = 0;
      pipy_output_event(ppl, pipy_MessageStart_new(0));
      pipy_output_event(ppl, pipy_Data_new("Hi!", 3));
      pipy_output_event(ppl, pipy_MessageEnd_new(0, 0));
    }
  }
}

void pipy_module_init() {
  pipy_define_pipeline("", pipeline_init, pipeline_free, pipeline_process);
}
