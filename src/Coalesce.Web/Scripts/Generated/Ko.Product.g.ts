
/// <reference path="../coalesce.dependencies.d.ts" />

// Generated by IntelliTect.Coalesce

module ViewModels {
    
    export class Product extends Coalesce.BaseViewModel {
        public readonly modelName = "Product";
        public readonly primaryKeyName = "productId";
        public readonly modelDisplayName = "Product";
        public readonly apiController = "/Product";
        public readonly viewController = "/Product";
        
        /** Configuration for all instances of Product. Can be overidden on each instance via instance.coalesceConfig. */
        public static coalesceConfig: Coalesce.ViewModelConfiguration<Product>
            = new Coalesce.ViewModelConfiguration<Product>(Coalesce.GlobalConfiguration.viewModel);
        
        /** Configuration for the current Product instance. */
        public coalesceConfig: Coalesce.ViewModelConfiguration<this>
            = new Coalesce.ViewModelConfiguration<Product>(Product.coalesceConfig);
        
        /** The namespace containing all possible values of this.dataSource. */
        public dataSources: typeof ListViewModels.ProductDataSources = ListViewModels.ProductDataSources;
        
        
        public productId: KnockoutObservable<number | null> = ko.observable(null);
        public name: KnockoutObservable<string | null> = ko.observable(null);
        public address: KnockoutObservable<string | null> = ko.observable(null);
        public city: KnockoutObservable<string | null> = ko.observable(null);
        public state: KnockoutObservable<string | null> = ko.observable(null);
        public postalCode: KnockoutObservable<string | null> = ko.observable(null);
        public uniqueId: KnockoutObservable<string | null> = ko.observable(null);
        
        
        
        
        
        
        
        /** 
            Load the ViewModel object from the DTO.
            @param data: The incoming data object to load.
            @param force: Will override the check against isLoading that is done to prevent recursion. False is default.
            @param allowCollectionDeletes: Set true when entire collections are loaded. True is the default. 
            In some cases only a partial collection is returned, set to false to only add/update collections.
        */
        public loadFromDto = (data: any, force: boolean = false, allowCollectionDeletes: boolean = true): void => {
            if (!data || (!force && this.isLoading())) return;
            this.isLoading(true);
            // Set the ID 
            this.myId = data.productId;
            this.productId(data.productId);
            // Load the lists of other objects
            
            // The rest of the objects are loaded now.
            this.name(data.name);
            this.address(data.address);
            this.city(data.city);
            this.state(data.state);
            this.postalCode(data.postalCode);
            this.uniqueId(data.uniqueId);
            if (this.coalesceConfig.onLoadFromDto()){
                this.coalesceConfig.onLoadFromDto()(this as any);
            }
            this.isLoading(false);
            this.isDirty(false);
            if (this.coalesceConfig.validateOnLoadFromDto()) this.validate();
        };
        
        /** Saves this object into a data transfer object to send to the server. */
        public saveToDto = (): any => {
            var dto: any = {};
            dto.productId = this.productId();
            
            dto.name = this.name();
            dto.address = this.address();
            dto.city = this.city();
            dto.state = this.state();
            dto.postalCode = this.postalCode();
            dto.uniqueId = this.uniqueId();
            
            return dto;
        }
        
        /** 
            Loads any child objects that have an ID set, but not the full object.
            This is useful when creating an object that has a parent object and the ID is set on the new child.
        */
        public loadChildren = (callback?: () => void): void => {
            var loadingCount = 0;
            if (loadingCount == 0 && typeof(callback) == "function") { callback(); }
        };
        
        public setupValidation(): void {
            if (this.errors !== null) return;
            this.errors = ko.validation.group([
            ]);
            this.warnings = ko.validation.group([
            ]);
        }
        
        constructor(newItem?: object, parent?: Coalesce.BaseViewModel | ListViewModels.ProductList) {
            super(parent);
            this.baseInitialize();
            const self = this;
            
            
            
            
            
            
            self.name.subscribe(self.autoSave);
            self.address.subscribe(self.autoSave);
            self.city.subscribe(self.autoSave);
            self.state.subscribe(self.autoSave);
            self.postalCode.subscribe(self.autoSave);
            self.uniqueId.subscribe(self.autoSave);
            
            if (newItem) {
                self.loadFromDto(newItem, true);
            }
        }
    }
    
    export namespace Product {
    }
}
