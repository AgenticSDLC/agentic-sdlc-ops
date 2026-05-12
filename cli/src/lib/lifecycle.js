const LIFECYCLE_STATES = ["ready-for-build", "in-progress", "in-review", "done"];
const LIFECYCLE_STATE_SET = new Set(LIFECYCLE_STATES);

function isLifecycleState(value) {
  return LIFECYCLE_STATE_SET.has(value);
}

module.exports = {
  LIFECYCLE_STATES,
  LIFECYCLE_STATE_SET,
  isLifecycleState,
};
