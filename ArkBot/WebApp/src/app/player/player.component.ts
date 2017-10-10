import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { NotificationsService } from 'angular2-notifications';
import * as moment from 'moment'

import { Player } from '../player';
import { Creature } from '../creature';
import { DataService } from '../data.service';
import { MessageService } from '../message.service';
import { HttpService } from '../http.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements OnInit, OnDestroy {
  private menuOption: string = undefined; 
  private menuOptionSubscription: any;

  serverUpdatedSubscription: any;
  player: Player;
  filteredCreatures: Creature[];
  imprintCreatures: Creature[];
  imprintNotifications: boolean = false;
  creaturesFilter: string;
  filteredClusterCreatures: any[];
  creaturesClusterFilter: string;
  points: any[];
  keysGetter = Object.keys;
  steamId: string;
  loaded: boolean = false;
  showMap: boolean = false;
  serverKey: string;
  clusterKey: string;
  creaturesMode: string = "status";
  creatureStates: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private httpService: HttpService,
    public dataService: DataService,
    private messageService: MessageService,
    private notificationsService: NotificationsService,
    private ref: ChangeDetectorRef) {
    }

    getPlayer(): void {
      this.httpService
        .getPlayer(this.steamId)
        .then(player => {
          var serverKeys = Object.keys(player.Servers);
          if (!this.serverKey || serverKeys.find(k => k == this.serverKey) == undefined) this.serverKey = serverKeys.length > 0 ? serverKeys[0]: null;

          var clusterKeys = Object.keys(player.Clusters);
          if (!this.clusterKey || clusterKeys.find(k => k == this.clusterKey) == undefined) this.clusterKey = clusterKeys.length > 0 ? clusterKeys[0] : null;
          this.player = player;

          this.sort();
          this.filter();
          this.sortCluster();
          this.filterCluster();
          this.loaded = true;

          this.ref.detectChanges(); //todo: evaluate
        })
        .catch(error => {
          this.player = null;
          this.filteredCreatures = null;
          this.imprintCreatures = null;
          this.filteredClusterCreatures = null;
          this.loaded = true;
        });
  }
  
  ngOnInit(): void {
    this.menuOptionSubscription = this.dataService.MenuOption.subscribe(menuOption => this.menuOption = menuOption);
    this.steamId = this.route.snapshot.params['playerid'];

    this.serverUpdatedSubscription = this.messageService.serverUpdated$.subscribe(serverKey => this.updateServer(serverKey));

    this.getPlayer();
  }

  ngOnDestroy() {
    this.menuOptionSubscription.unsubscribe();
    this.serverUpdatedSubscription.unsubscribe();
  }

  haveMatingCooldown(creature: any): boolean {
    return creature.NextMating != null ? new Date(creature.NextMating) > new Date() : false;
  }

  toDate(datejson: string): string {
    //todo: fix locale
    return new Date(datejson).toLocaleString('sv-SE');
  }

  toRelativeDate(datejson: string): string {
    return moment(new Date(datejson)).fromNow();
  }

  active(serverKey: string): boolean {
    return this.serverKey == serverKey;
  }

  activate(serverKey: string): void {
    this.serverKey = serverKey;
    this.sort();
    this.filter();
  }

  serverWidth(): number {
    let len = Object.keys(this.player.Servers).length;
    return 100.0/len;
  }

  activeCluster(clusterKey: string): boolean {
    return this.clusterKey == clusterKey;
  }

  activateCluster(clusterKey: string): void {
    this.clusterKey = clusterKey;
    this.sortCluster();
    this.filterCluster();
  }

  clusterWidth(): number {
    let len = Object.keys(this.player.Clusters).length;
    return 100.0/len;
  }

  sort(): void {
    this.player.Servers[this.serverKey].Creatures.sort((c1, c2) => {
        if(c1.FoodStatus < c2.FoodStatus) {
          return -1;
        } else if(c1.FoodStatus > c2.FoodStatus){
            return 1;
        } else {
          return 0; 
        }
    });
  }

  filter(): void {
    if (this.creaturesFilter == null || this.creaturesFilter.length == 0) this.filteredCreatures = this.player.Servers[this.serverKey].Creatures;
    else {
      let filter = this.creaturesFilter.toLowerCase();
      this.filteredCreatures = this.player.Servers[this.serverKey].Creatures.filter(creature => 
        (creature.Species != null && creature.Species.toLowerCase().indexOf(filter) >= 0) 
        || (creature.Name != null && creature.Name.toLowerCase().indexOf(filter) >= 0));
    }

    let imprintCreatures = this.player.Servers[this.serverKey].Creatures.filter(creature => creature.BabyAge != null);
    imprintCreatures.sort((c1, c2) => {
        if(new Date(c1.BabyNextCuddle) < new Date(c2.BabyNextCuddle)) {
          return -1;
        } else if(new Date(c1.BabyNextCuddle) > new Date(c2.BabyNextCuddle)) {
            return 1;
        } else {
          return 0; 
        }
    });
    this.imprintCreatures = imprintCreatures;

    let points = [];
    for(let creature of this.filteredCreatures) {
      let point = {} as any;
      point.x = creature.TopoMapX;
      point.y = creature.TopoMapY;
      points.push(point);
    }
    this.points = points;
  }

  sortCluster(): void {
    if(this.clusterKey == null) return;

    this.player.Clusters[this.clusterKey].Creatures.sort((c1, c2) => {
        if(c1.Level > c2.Level) {
          return -1;
        } else if(c1.Level < c2.Level){
            return 1;
        } else {
          return 0; 
        }
    });
  }

  filterCluster(): void {
    if(this.clusterKey == null) {
      this.filteredClusterCreatures = null;
      return;
    }

    if (this.creaturesClusterFilter == null || this.creaturesClusterFilter.length == 0) this.filteredClusterCreatures = this.player.Clusters[this.clusterKey].Creatures;
    else {
      let filter = this.creaturesClusterFilter.toLowerCase();
      this.filteredClusterCreatures = this.player.Clusters[this.clusterKey].Creatures.filter(creature => 
        (creature.Species != null && creature.Species.toLowerCase().indexOf(filter) >= 0) 
        || (creature.Name != null && creature.Name.toLowerCase().indexOf(filter) >= 0));
    }
  }

  run(): void {
    if(this.steamId == null || this.steamId == "") {
      this.player = null;
      this.filteredCreatures = null;
      this.imprintCreatures = null;
      return;
    }
    this.getPlayer();
  }

  openMap(event: any): void {
    this.showMap = true;
    event.stopPropagation();
  }

  closeMap(event: any): void {
    this.showMap = false;
  }

  updateServer(serverKey: string): void {
    this.getPlayer();
    this.showServerUpdateNotification(serverKey);
  }

  haveCluster(): boolean {
    return this.player != null && Object.keys(this.player.Clusters).length > 0;
  }

  sumKibbleAndEggs(): number {
    return this.player.Servers[this.serverKey].KibblesAndEggs != undefined ? this.player.Servers[this.serverKey].KibblesAndEggs.reduce((a, b) => a + b.KibbleCount + b.EggCount, 0) : 0;
  }

  showServerUpdateNotification(serverKey: string): void {
    this.notificationsService.success(
      'Server Update',
      `${serverKey} was updated; Reloading data...`,
      {
          showProgressBar: true,
          pauseOnHover: true,
          clickToClose: true
      }
    );
  }

  isMenuActive(menuOption: string): boolean {
    return this.menuOption == menuOption;
  }

  getStateForCreature(creature: any): any {
    if (!creature) return undefined;
    let s = this.creatureStates[creature.Id1 + "_" + creature.Id2];
    if (!s) {
      s = { imprintNotifications: true };
      this.creatureStates[creature.Id1 + "_" + creature.Id2] = s;
    }
    return s;
  }

  toggleImprintNotificationForCreature(creature: any): void {
    let s = this.getStateForCreature(creature);

    s.imprintNotifications = !s.imprintNotifications;
  }

  activeCreaturesMode(mode: string): boolean {
    return mode == this.creaturesMode;
  }

  activateCreaturesMode(mode: string): void {
    this.creaturesMode = mode;
  }

  copyCreature(creature: any): void {

  }

  getCurrentServer() {
    if (!(this.dataService && this.dataService.Servers && this.dataService.Servers.Servers)) return undefined;
    let server =  this.dataService.Servers.Servers.find(s => s.Key == this.serverKey);
    return server;
  }
}