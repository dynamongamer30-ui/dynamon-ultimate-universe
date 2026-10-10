/* Royal Void targeted repair. Append to the CURRENT protected runtime.
 * Keeps existing controls, hooks and automation. No network or key handling.
 */
(function () {
  'use strict';
  var revision = 'owned-mons-party-1';
  function cls(name) {
    return (window.$DW || window.$hxClasses || {})['co.doubleduck.dynamons3.' + name];
  }
  function requireOpen(key) {
    var locks = window.__DG_LOCKS || {};
    if (locks.app || locks.mods || locks.unlock || locks[key]) {
      throw Error('This feature is currently unavailable.');
    }
  }
  function addMissingMons() {
    requireOpen('unlockMons');
    var game = cls('meta.GameState'), db = cls('data.GameplayDB'), Mon = cls('core.Mon');
    if (!game || !db || typeof Mon !== 'function' ||
        typeof game.getPlayerMons !== 'function' ||
        typeof game.addPlayerMon !== 'function' ||
        typeof game.saveMonsData !== 'function' || typeof db.getAllMons !== 'function') {
      throw Error('This game version does not support adding owned Dynamons');
    }
    var owned = Object.create(null), unique = Object.create(null), pending = [];
    game.getPlayerMons(true).forEach(function (mon) {
      if (mon && typeof mon.getId === 'function') owned[mon.getId()] = true;
    });
    // Construct first: an invalid database row must not leave a partial collection.
    db.getAllMons().forEach(function (data) {
      if (!data || typeof data.id !== 'string' || !data.id || data.mergedDynamon != null ||
          /^sealed_door/.test(data.id) || unique[data.id]) return;
      unique[data.id] = true;
      if (!owned[data.id]) pending.push(new Mon(data.id, 1));
    });
    var added = 0;
    try {
      pending.forEach(function (mon) {
        game.addPlayerMon(mon);
        added++;
      });
      // The game's own method persists both MONS_DATA and CAPTURED_MONS.
      // GameState has no setString method in 1.13.37.
      game.saveMonsData();
    } catch (error) {
      throw Error('Unlock stopped after ' + added + ' additions: ' + String(error.message || error));
    }
    return {ok: true, added: added, owned: game.getPlayerMons(true).filter(Boolean).length,
      message: added + ' playable Dynamons added; existing Dynamons unchanged'};
  }
  function install() {
    var bridge = window.__DG_NATIVE;
    if (!bridge || typeof bridge.command !== 'function' || bridge.__dgMenuFix === revision) return;
    var previous = bridge.command;
    bridge.command = function (name, args) {
      args = args || {};
      try {
        if (name === 'unlock' && args.kind === 'Mons') return addMissingMons();
        if (name === 'unlockAll') {
          ['Mons', 'Skins', 'Emotes', 'Avatars'].forEach(function (kind) {
            requireOpen('unlock' + kind);
          });
          var messages = [];
          ['Mons', 'Skins', 'Emotes', 'Avatars'].forEach(function (kind) {
            var result = bridge.command('unlock', {kind: kind});
            if (!result || !result.ok) throw Error(kind + ': ' + (result && result.error || 'Action failed'));
            messages.push(result.message);
          });
          return {ok: true, message: messages.join(' · ')};
        }
        var result = previous.call(bridge, name, args);
        if (name === 'party' && result && result.ok) {
          var game = cls('meta.GameState');
          result.value = game.getParty().filter(Boolean).length;
        }
        return result;
      } catch (error) {
        return {ok: false, error: String(error.message || error)};
      }
    };
    bridge.__dgMenuFix = revision;
  }
  var previousInstaller = window.__DG_INSTALL_NATIVE;
  if (typeof previousInstaller === 'function') {
    window.__DG_INSTALL_NATIVE = function () {
      var result = previousInstaller.apply(this, arguments);
      install();
      return result;
    };
  }
  install();
})();
