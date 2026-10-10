/* Royal Void targeted repair. Append to the CURRENT protected runtime.
 * Keeps existing controls, hooks and automation. No network or key handling.
 */
(function () {
  'use strict';
  var revision = 'arena-worlds-party-max-3';
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
    var maxLevel = Number(typeof Mon.getMaxLevel === 'function' ? Mon.getMaxLevel() : NaN);
    if (!Number.isInteger(maxLevel) || maxLevel < 1) throw Error('Cannot determine the game maximum level');
    var owned = Object.create(null), unique = Object.create(null), pending = [], upgrades = [];
    game.getPlayerMons(true).forEach(function (mon) {
      if (mon && typeof mon.getId === 'function') {
        owned[mon.getId()] = true;
        if (typeof mon.getLevel !== 'function') throw Error('Cannot read owned Dynamon level');
        var level = Number(mon.getLevel());
        if (!Number.isInteger(level) || level < 1) throw Error('Invalid owned Dynamon level');
        if (level < maxLevel) {
          if (typeof mon.doLevelUp !== 'function') throw Error('Cannot upgrade owned Dynamons');
          upgrades.push({mon: mon, levels: maxLevel - level});
        }
      }
    });
    // Construct first: an invalid database row must not leave a partial collection.
    db.getAllMons().forEach(function (data) {
      if (!data || typeof data.id !== 'string' || !data.id || data.mergedDynamon != null ||
          /^sealed_door/.test(data.id) || unique[data.id]) return;
      unique[data.id] = true;
      if (!owned[data.id]) pending.push(new Mon(data.id, maxLevel));
    });
    var added = 0, upgraded = 0;
    try {
      upgrades.forEach(function (entry) {
        entry.mon.doLevelUp(false, entry.levels);
        if (Number(entry.mon.getLevel()) !== maxLevel) throw Error('Level upgrade did not reach maximum');
        upgraded++;
      });
      pending.forEach(function (mon) {
        game.addPlayerMon(mon);
        added++;
      });
      // The game's own method persists both MONS_DATA and CAPTURED_MONS.
      // GameState has no setString method in 1.13.37.
      game.saveMonsData();
    } catch (error) {
      throw Error('Unlock stopped after ' + added + ' additions and ' + upgraded + ' upgrades: ' + String(error.message || error));
    }
    return {ok: true, added: added, upgraded: upgraded, maxLevel: maxLevel, owned: game.getPlayerMons(true).filter(Boolean).length,
      message: added + ' Dynamons added at level ' + maxLevel + '; ' + upgraded + ' owned Dynamons upgraded'};
  }
  function unlockWorlds() {
    requireOpen('unlockWorlds');
    var game=cls('meta.GameState'), db=cls('data.GameplayDB');
    if(!game||!db||typeof db.getHubData!=='function'||typeof game.setMapUnlocked!=='function'||
       typeof game.setItemAmount!=='function'||typeof game.saveItems!=='function')throw Error('World unlock API unavailable');
    var hub=db.getHubData(), nodes=hub&&hub.mapNodes;
    if(!Array.isArray(nodes))throw Error('World catalogue unavailable');
    game.setItemAmount('unlock_all_worlds',1);
    var count=0;
    nodes.forEach(function(node){
      if(!node||typeof node.id!=='string'||!node.id)return;
      game.setMapUnlocked(node.id,true);count++;
      if(typeof db.getActiveMapVariant==='function'){
        var variant=db.getActiveMapVariant(node.id);
        if(variant&&variant.idModifier)game.setMapUnlocked(node.id+String(variant.idModifier),true);
      }
    });
    game.saveItems();
    return {ok:true,worlds:count,message:count+' world entries unlocked; reopen the map'};
  }
  function install() {
    var bridge = window.__DG_NATIVE;
    if (!bridge || typeof bridge.command !== 'function' || bridge.__dgMenuFix === revision) return;
    var previous = bridge.command;
    bridge.command = function (name, args) {
      args = args || {};
      try {
        if (name === 'unlock' && args.kind === 'Mons') return addMissingMons();
        if (name === 'unlock' && args.kind === 'Worlds') return unlockWorlds();
        if (name === 'unlockAll') {
          ['Mons', 'Skins', 'Emotes', 'Avatars', 'Worlds'].forEach(function (kind) {
            requireOpen('unlock' + kind);
          });
          var messages = [];
          ['Mons', 'Skins', 'Emotes', 'Avatars', 'Worlds'].forEach(function (kind) {
            var result = bridge.command('unlock', {kind: kind});
            if (!result || !result.ok) throw Error(kind + ': ' + (result && result.error || 'Action failed'));
            messages.push(result.message);
          });
          return {ok: true, message: messages.join(' · ')};
        }
        var result = previous.call(bridge, name, args);
        if(name==='scan' && result && result.ok && result.mons){result.mons.forEach(function(mon){mon.sideId=mon.side==='Enemy'?'enemy':'player';});}

        if (name === 'party' && result && result.ok) {
          var game = cls('meta.GameState');
          result.value = game.getParty().filter(Boolean).length;
        }
        return result;
      } catch (error) {
        return {ok: false, error: String(error.message || error)};
      }
    };
    var snapshot=bridge.snapshot;
    bridge.snapshot=function(){
      var result=snapshot.apply(bridge,arguments);
      if(result&&result.ok){
        result.flags=result.flags||{};result.flags.shopfix=true;
        var next={};Object.keys(result.locks||{}).forEach(function(key){next[key]=result.locks[key];});
        next.shopfix=true;
        if(window.__DG_matchActive&&window.__DG_matchActive())next.botMatch=true;
        result.locks=next;
      }
      return result;
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
