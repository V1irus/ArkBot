﻿using ArkBot.Data;
using ArkBot.ViewModel;
using ArkBot.WebApi.Model;
using ArkSavegameToolkitNet.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web.Http;

namespace ArkBot.WebApi.Controllers
{
    public class PlayerController : ApiController
    {
        /// <param name="id">steamId</param>
        /// <returns></returns>
        public PlayerViewModel Get(string id)
        {
            var result = new PlayerViewModel
            {
            };

            foreach (var context in Workspace.Instance.ServerContexts.Values)
            {
                var player = context.Players?.FirstOrDefault(x => x.SteamId.Equals(id, StringComparison.OrdinalIgnoreCase));
                if (player == null) continue;

                var vm = new PlayerServerViewModel
                {
                    ServerKey = context.Config.Key,
                    CharacterName = player.CharacterName,
                    Gender = player.Gender.ToString(),
                    Level = player.CharacterLevel,
                    Latitude = player.Location?.Latitude,
                    Longitude = player.Location?.Longitude,
                    EngramPoints = player.TotalEngramPoints,
                    TribeId = player.TribeId,
                    TribeName = player.TribeId.HasValue ? context.Tribes.FirstOrDefault(x => x.Id == player.TribeId.Value)?.Name : null
                };

                var playercreatures = context.TamedCreatures.Where(x => (ulong)x.TargetingTeam == player.Id || (x.OwningPlayerId.HasValue && (ulong)x.OwningPlayerId == player.Id)).ToArray();
                var tribecreatures = player.TribeId.HasValue ? context.TamedCreatures.Where(x => x.TargetingTeam == player.TribeId.Value && !playercreatures.Any(y => y.Id == x.Id)).ToArray() : new ArkTamedCreature[] { };
                foreach (var item in playercreatures.Select(x => new { c = x, o = "player" }).Concat(tribecreatures.Select(x => new { c = x, o = "tribe" })))
                {

                    var currentFood = item.c.CurrentStatusValues?.Length > 4 ? item.c.CurrentStatusValues[4] : null;
                    var maxFood = item.c.BaseStats?.Length > 4 && item.c.TamedStats?.Length > 4 ? 
                        ArkContext.CalculateMaxStat(
                            ArkSpeciesStatsData.Stat.Food, 
                            item.c.ClassName, 
                            item.c.BaseStats[4], 
                            item.c.TamedStats[4], 
                            (decimal)(item.c.DinoImprintingQuality ?? 0f), 
                            (decimal)(item.c.TamedIneffectivenessModifier ?? 0f)) * ((item.c.IsBaby ? item.c.BabyAge : null) ?? 1) : null;
                    //todo: experiemental baby age/max food handling
                    var foodStatus = currentFood.HasValue && maxFood.HasValue ? currentFood.Value / (float)maxFood.Value : (float?)null;
                    if (foodStatus.HasValue && foodStatus > 1f) foodStatus = 1f;

                    var aliases = ArkSpeciesAliases.Instance.GetAliases(item.c.ClassName);
                    var vmc = new TamedCreatureViewModel
                    {
                        Name = item.c.Name,
                        ClassName = item.c.ClassName,
                        Species = aliases.FirstOrDefault(),
                        Aliases = aliases.Skip(2).ToArray(), //skip primary name and class name
                        Gender = item.c.Gender.ToString(),
                        BaseLevel = item.c.BaseLevel,
                        Level = item.c.BaseLevel + item.c.ExtraCharacterLevel,
                        Imprint = item.c.DinoImprintingQuality,
                        FoodStatus = foodStatus,
                        Latitude = item.c.Location?.Latitude,
                        Longitude = item.c.Location?.Longitude,
                        NextMating = item.c.NextAllowedMatingTimeApprox,
                        OwnerType = item.o
                    };
                    vm.Creatures.Add(vmc);
                }

                result.Servers.Add(vm);
            }
            
            return result;
        }
    }
}