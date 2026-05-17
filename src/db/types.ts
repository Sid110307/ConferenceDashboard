export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			accommodation_allocations: {
				Row: {
					allocation_status: Database["public"]["Enums"]["allocation_status_enum"] | null;
					attendee: string | null;
					checkin_date: string | null;
					checkout_date: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					notes: string | null;
					room: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					allocation_status?:
						| Database["public"]["Enums"]["allocation_status_enum"]
						| null;
					attendee?: string | null;
					checkin_date?: string | null;
					checkout_date?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					notes?: string | null;
					room?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					allocation_status?:
						| Database["public"]["Enums"]["allocation_status_enum"]
						| null;
					attendee?: string | null;
					checkin_date?: string | null;
					checkout_date?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					notes?: string | null;
					room?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "accommodation_allocations_attendee_fkey";
						columns: ["attendee"];
						isOneToOne: false;
						referencedRelation: "attendees";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "accommodation_allocations_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "accommodation_allocations_room_fkey";
						columns: ["room"];
						isOneToOne: false;
						referencedRelation: "accommodation_rooms";
						referencedColumns: ["id"];
					},
				];
			};
			accommodation_issues: {
				Row: {
					assigned_to: string | null;
					attendee: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					id: string;
					issue_status: Database["public"]["Enums"]["issue_status_enum"] | null;
					issue_title: string | null;
					priority: Database["public"]["Enums"]["priority_medium_enum"] | null;
					resolved_at: string | null;
					room: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					assigned_to?: string | null;
					attendee?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					issue_status?: Database["public"]["Enums"]["issue_status_enum"] | null;
					issue_title?: string | null;
					priority?: Database["public"]["Enums"]["priority_medium_enum"] | null;
					resolved_at?: string | null;
					room?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					assigned_to?: string | null;
					attendee?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					issue_status?: Database["public"]["Enums"]["issue_status_enum"] | null;
					issue_title?: string | null;
					priority?: Database["public"]["Enums"]["priority_medium_enum"] | null;
					resolved_at?: string | null;
					room?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "accommodation_issues_attendee_fkey";
						columns: ["attendee"];
						isOneToOne: false;
						referencedRelation: "attendees";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "accommodation_issues_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "accommodation_issues_room_fkey";
						columns: ["room"];
						isOneToOne: false;
						referencedRelation: "accommodation_rooms";
						referencedColumns: ["id"];
					},
				];
			};
			accommodation_rooms: {
				Row: {
					building: string | null;
					capacity: number | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					gender_preference: Database["public"]["Enums"]["gender_preference_enum"] | null;
					id: string;
					notes: string | null;
					occupied_count: number | null;
					room_code: string | null;
					room_type: Database["public"]["Enums"]["room_type_enum"] | null;
					status_label: Database["public"]["Enums"]["room_status_label_enum"] | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					building?: string | null;
					capacity?: number | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					gender_preference?:
						| Database["public"]["Enums"]["gender_preference_enum"]
						| null;
					id?: string;
					notes?: string | null;
					occupied_count?: number | null;
					room_code?: string | null;
					room_type?: Database["public"]["Enums"]["room_type_enum"] | null;
					status_label?: Database["public"]["Enums"]["room_status_label_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					building?: string | null;
					capacity?: number | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					gender_preference?:
						| Database["public"]["Enums"]["gender_preference_enum"]
						| null;
					id?: string;
					notes?: string | null;
					occupied_count?: number | null;
					room_code?: string | null;
					room_type?: Database["public"]["Enums"]["room_type_enum"] | null;
					status_label?: Database["public"]["Enums"]["room_status_label_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "accommodation_rooms_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			announcements: {
				Row: {
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					is_public: boolean | null;
					message: string | null;
					priority: Database["public"]["Enums"]["priority_normal_enum"] | null;
					sort: number | null;
					status: string | null;
					title: string | null;
					updated_at: string | null;
					updated_by: string | null;
					visible_from: string | null;
					visible_until: string | null;
				};
				Insert: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_public?: boolean | null;
					message?: string | null;
					priority?: Database["public"]["Enums"]["priority_normal_enum"] | null;
					sort?: number | null;
					status?: string | null;
					title?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
					visible_from?: string | null;
					visible_until?: string | null;
				};
				Update: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_public?: boolean | null;
					message?: string | null;
					priority?: Database["public"]["Enums"]["priority_normal_enum"] | null;
					sort?: number | null;
					status?: string | null;
					title?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
					visible_from?: string | null;
					visible_until?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "announcements_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			app_settings: {
				Row: {
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					id: string;
					setting_key: string | null;
					setting_value: Json | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					setting_key?: string | null;
					setting_value?: Json | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					setting_key?: string | null;
					setting_value?: Json | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "app_settings_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			attendees: {
				Row: {
					attendee_code: string | null;
					category: Database["public"]["Enums"]["attendee_category_enum"] | null;
					checked_in_at: string | null;
					checkin_status: Database["public"]["Enums"]["checkin_status_enum"] | null;
					city: string | null;
					conference: string | null;
					country: string | null;
					created_at: string | null;
					created_by: string | null;
					designation: string | null;
					diet_preference: Database["public"]["Enums"]["diet_preference_enum"] | null;
					email: string | null;
					extra_data: Json | null;
					id: string;
					institution: string | null;
					name: string | null;
					notes: string | null;
					phone: string | null;
					registration_status:
						| Database["public"]["Enums"]["registration_status_enum"]
						| null;
					state: string | null;
					travel_mode: Database["public"]["Enums"]["travel_mode_enum"] | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					attendee_code?: string | null;
					category?: Database["public"]["Enums"]["attendee_category_enum"] | null;
					checked_in_at?: string | null;
					checkin_status?: Database["public"]["Enums"]["checkin_status_enum"] | null;
					city?: string | null;
					conference?: string | null;
					country?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					designation?: string | null;
					diet_preference?: Database["public"]["Enums"]["diet_preference_enum"] | null;
					email?: string | null;
					extra_data?: Json | null;
					id?: string;
					institution?: string | null;
					name?: string | null;
					notes?: string | null;
					phone?: string | null;
					registration_status?:
						| Database["public"]["Enums"]["registration_status_enum"]
						| null;
					state?: string | null;
					travel_mode?: Database["public"]["Enums"]["travel_mode_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					attendee_code?: string | null;
					category?: Database["public"]["Enums"]["attendee_category_enum"] | null;
					checked_in_at?: string | null;
					checkin_status?: Database["public"]["Enums"]["checkin_status_enum"] | null;
					city?: string | null;
					conference?: string | null;
					country?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					designation?: string | null;
					diet_preference?: Database["public"]["Enums"]["diet_preference_enum"] | null;
					email?: string | null;
					extra_data?: Json | null;
					id?: string;
					institution?: string | null;
					name?: string | null;
					notes?: string | null;
					phone?: string | null;
					registration_status?:
						| Database["public"]["Enums"]["registration_status_enum"]
						| null;
					state?: string | null;
					travel_mode?: Database["public"]["Enums"]["travel_mode_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "attendees_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			certificates: {
				Row: {
					attendee: string | null;
					certificate_code: string | null;
					certificate_file: string | null;
					certificate_type: Database["public"]["Enums"]["certificate_type_enum"] | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					issued_at: string | null;
					issued_status: Database["public"]["Enums"]["issued_status_enum"] | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					attendee?: string | null;
					certificate_code?: string | null;
					certificate_file?: string | null;
					certificate_type?: Database["public"]["Enums"]["certificate_type_enum"] | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					issued_at?: string | null;
					issued_status?: Database["public"]["Enums"]["issued_status_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					attendee?: string | null;
					certificate_code?: string | null;
					certificate_file?: string | null;
					certificate_type?: Database["public"]["Enums"]["certificate_type_enum"] | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					issued_at?: string | null;
					issued_status?: Database["public"]["Enums"]["issued_status_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "certificates_attendee_fkey";
						columns: ["attendee"];
						isOneToOne: false;
						referencedRelation: "attendees";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "certificates_certificate_file_fkey";
						columns: ["certificate_file"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "certificates_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			conference_editors: {
				Row: {
					conference: string;
					created_at: string | null;
					directus_user: string;
					id: string;
					is_active: boolean | null;
					role: string | null;
					updated_at: string | null;
				};
				Insert: {
					conference: string;
					created_at?: string | null;
					directus_user: string;
					id?: string;
					is_active?: boolean | null;
					role?: string | null;
					updated_at?: string | null;
				};
				Update: {
					conference?: string;
					created_at?: string | null;
					directus_user?: string;
					id?: string;
					is_active?: boolean | null;
					role?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "conference_editors_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "conference_editors_directus_user_fkey";
						columns: ["directus_user"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			conferences: {
				Row: {
					banner_image: string | null;
					created_at: string | null;
					created_by: string | null;
					current_day: number | null;
					description: string | null;
					end_date: string | null;
					id: string;
					logo: string | null;
					name: string | null;
					public_status: Database["public"]["Enums"]["public_status_enum"] | null;
					settings: Json | null;
					short_code: string | null;
					short_name: string | null;
					start_date: string | null;
					status: string | null;
					updated_at: string | null;
					updated_by: string | null;
					venue_address: string | null;
					venue_name: string | null;
				};
				Insert: {
					banner_image?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					current_day?: number | null;
					description?: string | null;
					end_date?: string | null;
					id?: string;
					logo?: string | null;
					name?: string | null;
					public_status?: Database["public"]["Enums"]["public_status_enum"] | null;
					settings?: Json | null;
					short_code?: string | null;
					short_name?: string | null;
					start_date?: string | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
					venue_address?: string | null;
					venue_name?: string | null;
				};
				Update: {
					banner_image?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					current_day?: number | null;
					description?: string | null;
					end_date?: string | null;
					id?: string;
					logo?: string | null;
					name?: string | null;
					public_status?: Database["public"]["Enums"]["public_status_enum"] | null;
					settings?: Json | null;
					short_code?: string | null;
					short_name?: string | null;
					start_date?: string | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
					venue_address?: string | null;
					venue_name?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "conferences_banner_image_fkey";
						columns: ["banner_image"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "conferences_logo_fkey";
						columns: ["logo"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
				];
			};
			dashboard_pages: {
				Row: {
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					is_enabled: boolean | null;
					is_public: boolean | null;
					page_key: string | null;
					route: string | null;
					sort: number | null;
					sort_order: number | null;
					status: string | null;
					subtitle: string | null;
					title: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_enabled?: boolean | null;
					is_public?: boolean | null;
					page_key?: string | null;
					route?: string | null;
					sort?: number | null;
					sort_order?: number | null;
					status?: string | null;
					subtitle?: string | null;
					title?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_enabled?: boolean | null;
					is_public?: boolean | null;
					page_key?: string | null;
					route?: string | null;
					sort?: number | null;
					sort_order?: number | null;
					status?: string | null;
					subtitle?: string | null;
					title?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "dashboard_pages_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			dashboard_widgets: {
				Row: {
					collection_name: string | null;
					conference: string | null;
					config: Json | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					is_enabled: boolean | null;
					page: string | null;
					sort: number | null;
					sort_order: number | null;
					status: string | null;
					title: string | null;
					updated_at: string | null;
					updated_by: string | null;
					widget_key: string | null;
					widget_type: Database["public"]["Enums"]["widget_type_enum"] | null;
				};
				Insert: {
					collection_name?: string | null;
					conference?: string | null;
					config?: Json | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_enabled?: boolean | null;
					page?: string | null;
					sort?: number | null;
					sort_order?: number | null;
					status?: string | null;
					title?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
					widget_key?: string | null;
					widget_type?: Database["public"]["Enums"]["widget_type_enum"] | null;
				};
				Update: {
					collection_name?: string | null;
					conference?: string | null;
					config?: Json | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_enabled?: boolean | null;
					page?: string | null;
					sort?: number | null;
					sort_order?: number | null;
					status?: string | null;
					title?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
					widget_key?: string | null;
					widget_type?: Database["public"]["Enums"]["widget_type_enum"] | null;
				};
				Relationships: [
					{
						foreignKeyName: "dashboard_widgets_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "dashboard_widgets_page_fkey";
						columns: ["page"];
						isOneToOne: false;
						referencedRelation: "dashboard_pages";
						referencedColumns: ["id"];
					},
				];
			};
			directus_access: {
				Row: {
					id: string;
					policy: string;
					role: string | null;
					sort: number | null;
					user: string | null;
				};
				Insert: {
					id: string;
					policy: string;
					role?: string | null;
					sort?: number | null;
					user?: string | null;
				};
				Update: {
					id?: string;
					policy?: string;
					role?: string | null;
					sort?: number | null;
					user?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_access_policy_foreign";
						columns: ["policy"];
						isOneToOne: false;
						referencedRelation: "directus_policies";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_access_role_foreign";
						columns: ["role"];
						isOneToOne: false;
						referencedRelation: "directus_roles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_access_user_foreign";
						columns: ["user"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_activity: {
				Row: {
					action: string;
					collection: string;
					id: number;
					ip: string | null;
					item: string;
					origin: string | null;
					timestamp: string;
					user: string | null;
					user_agent: string | null;
				};
				Insert: {
					action: string;
					collection: string;
					id?: number;
					ip?: string | null;
					item: string;
					origin?: string | null;
					timestamp?: string;
					user?: string | null;
					user_agent?: string | null;
				};
				Update: {
					action?: string;
					collection?: string;
					id?: number;
					ip?: string | null;
					item?: string;
					origin?: string | null;
					timestamp?: string;
					user?: string | null;
					user_agent?: string | null;
				};
				Relationships: [];
			};
			directus_collections: {
				Row: {
					accountability: string | null;
					archive_app_filter: boolean;
					archive_field: string | null;
					archive_value: string | null;
					collapse: string;
					collection: string;
					color: string | null;
					display_template: string | null;
					group: string | null;
					hidden: boolean;
					icon: string | null;
					item_duplication_fields: Json | null;
					note: string | null;
					preview_url: string | null;
					singleton: boolean;
					sort: number | null;
					sort_field: string | null;
					translations: Json | null;
					unarchive_value: string | null;
					versioning: boolean;
				};
				Insert: {
					accountability?: string | null;
					archive_app_filter?: boolean;
					archive_field?: string | null;
					archive_value?: string | null;
					collapse?: string;
					collection: string;
					color?: string | null;
					display_template?: string | null;
					group?: string | null;
					hidden?: boolean;
					icon?: string | null;
					item_duplication_fields?: Json | null;
					note?: string | null;
					preview_url?: string | null;
					singleton?: boolean;
					sort?: number | null;
					sort_field?: string | null;
					translations?: Json | null;
					unarchive_value?: string | null;
					versioning?: boolean;
				};
				Update: {
					accountability?: string | null;
					archive_app_filter?: boolean;
					archive_field?: string | null;
					archive_value?: string | null;
					collapse?: string;
					collection?: string;
					color?: string | null;
					display_template?: string | null;
					group?: string | null;
					hidden?: boolean;
					icon?: string | null;
					item_duplication_fields?: Json | null;
					note?: string | null;
					preview_url?: string | null;
					singleton?: boolean;
					sort?: number | null;
					sort_field?: string | null;
					translations?: Json | null;
					unarchive_value?: string | null;
					versioning?: boolean;
				};
				Relationships: [
					{
						foreignKeyName: "directus_collections_group_foreign";
						columns: ["group"];
						isOneToOne: false;
						referencedRelation: "directus_collections";
						referencedColumns: ["collection"];
					},
				];
			};
			directus_comments: {
				Row: {
					collection: string;
					comment: string;
					date_created: string | null;
					date_updated: string | null;
					id: string;
					item: string;
					user_created: string | null;
					user_updated: string | null;
				};
				Insert: {
					collection: string;
					comment: string;
					date_created?: string | null;
					date_updated?: string | null;
					id: string;
					item: string;
					user_created?: string | null;
					user_updated?: string | null;
				};
				Update: {
					collection?: string;
					comment?: string;
					date_created?: string | null;
					date_updated?: string | null;
					id?: string;
					item?: string;
					user_created?: string | null;
					user_updated?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_comments_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_comments_user_updated_foreign";
						columns: ["user_updated"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_dashboards: {
				Row: {
					color: string | null;
					date_created: string | null;
					icon: string;
					id: string;
					name: string;
					note: string | null;
					user_created: string | null;
				};
				Insert: {
					color?: string | null;
					date_created?: string | null;
					icon?: string;
					id: string;
					name: string;
					note?: string | null;
					user_created?: string | null;
				};
				Update: {
					color?: string | null;
					date_created?: string | null;
					icon?: string;
					id?: string;
					name?: string;
					note?: string | null;
					user_created?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_dashboards_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_deployment_projects: {
				Row: {
					date_created: string | null;
					deployable: boolean;
					deployment: string;
					external_id: string;
					framework: string | null;
					id: string;
					name: string;
					url: string | null;
					user_created: string | null;
				};
				Insert: {
					date_created?: string | null;
					deployable?: boolean;
					deployment: string;
					external_id: string;
					framework?: string | null;
					id: string;
					name: string;
					url?: string | null;
					user_created?: string | null;
				};
				Update: {
					date_created?: string | null;
					deployable?: boolean;
					deployment?: string;
					external_id?: string;
					framework?: string | null;
					id?: string;
					name?: string;
					url?: string | null;
					user_created?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_deployment_projects_deployment_foreign";
						columns: ["deployment"];
						isOneToOne: false;
						referencedRelation: "directus_deployments";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_deployment_projects_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_deployment_runs: {
				Row: {
					completed_at: string | null;
					date_created: string | null;
					external_id: string;
					id: string;
					project: string;
					started_at: string | null;
					status: string | null;
					target: string;
					url: string | null;
					user_created: string | null;
				};
				Insert: {
					completed_at?: string | null;
					date_created?: string | null;
					external_id: string;
					id: string;
					project: string;
					started_at?: string | null;
					status?: string | null;
					target: string;
					url?: string | null;
					user_created?: string | null;
				};
				Update: {
					completed_at?: string | null;
					date_created?: string | null;
					external_id?: string;
					id?: string;
					project?: string;
					started_at?: string | null;
					status?: string | null;
					target?: string;
					url?: string | null;
					user_created?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_deployment_runs_project_foreign";
						columns: ["project"];
						isOneToOne: false;
						referencedRelation: "directus_deployment_projects";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_deployment_runs_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_deployments: {
				Row: {
					credentials: string | null;
					date_created: string | null;
					id: string;
					last_synced_at: string | null;
					options: string | null;
					provider: string;
					user_created: string | null;
					webhook_ids: Json | null;
					webhook_secret: string | null;
				};
				Insert: {
					credentials?: string | null;
					date_created?: string | null;
					id: string;
					last_synced_at?: string | null;
					options?: string | null;
					provider: string;
					user_created?: string | null;
					webhook_ids?: Json | null;
					webhook_secret?: string | null;
				};
				Update: {
					credentials?: string | null;
					date_created?: string | null;
					id?: string;
					last_synced_at?: string | null;
					options?: string | null;
					provider?: string;
					user_created?: string | null;
					webhook_ids?: Json | null;
					webhook_secret?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_deployments_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_extensions: {
				Row: {
					bundle: string | null;
					enabled: boolean;
					folder: string;
					id: string;
					source: string;
				};
				Insert: {
					bundle?: string | null;
					enabled?: boolean;
					folder: string;
					id: string;
					source: string;
				};
				Update: {
					bundle?: string | null;
					enabled?: boolean;
					folder?: string;
					id?: string;
					source?: string;
				};
				Relationships: [];
			};
			directus_fields: {
				Row: {
					collection: string;
					conditions: Json | null;
					display: string | null;
					display_options: Json | null;
					field: string;
					group: string | null;
					hidden: boolean;
					id: number;
					interface: string | null;
					note: string | null;
					options: Json | null;
					readonly: boolean;
					required: boolean | null;
					searchable: boolean;
					sort: number | null;
					special: string | null;
					translations: Json | null;
					validation: Json | null;
					validation_message: string | null;
					width: string | null;
				};
				Insert: {
					collection: string;
					conditions?: Json | null;
					display?: string | null;
					display_options?: Json | null;
					field: string;
					group?: string | null;
					hidden?: boolean;
					id?: number;
					interface?: string | null;
					note?: string | null;
					options?: Json | null;
					readonly?: boolean;
					required?: boolean | null;
					searchable?: boolean;
					sort?: number | null;
					special?: string | null;
					translations?: Json | null;
					validation?: Json | null;
					validation_message?: string | null;
					width?: string | null;
				};
				Update: {
					collection?: string;
					conditions?: Json | null;
					display?: string | null;
					display_options?: Json | null;
					field?: string;
					group?: string | null;
					hidden?: boolean;
					id?: number;
					interface?: string | null;
					note?: string | null;
					options?: Json | null;
					readonly?: boolean;
					required?: boolean | null;
					searchable?: boolean;
					sort?: number | null;
					special?: string | null;
					translations?: Json | null;
					validation?: Json | null;
					validation_message?: string | null;
					width?: string | null;
				};
				Relationships: [];
			};
			directus_files: {
				Row: {
					charset: string | null;
					created_on: string;
					description: string | null;
					duration: number | null;
					embed: string | null;
					filename_disk: string | null;
					filename_download: string;
					filesize: number | null;
					focal_point_x: number | null;
					focal_point_y: number | null;
					folder: string | null;
					height: number | null;
					id: string;
					location: string | null;
					metadata: Json | null;
					modified_by: string | null;
					modified_on: string;
					storage: string;
					tags: string | null;
					title: string | null;
					tus_data: Json | null;
					tus_id: string | null;
					type: string | null;
					uploaded_by: string | null;
					uploaded_on: string | null;
					width: number | null;
				};
				Insert: {
					charset?: string | null;
					created_on?: string;
					description?: string | null;
					duration?: number | null;
					embed?: string | null;
					filename_disk?: string | null;
					filename_download: string;
					filesize?: number | null;
					focal_point_x?: number | null;
					focal_point_y?: number | null;
					folder?: string | null;
					height?: number | null;
					id: string;
					location?: string | null;
					metadata?: Json | null;
					modified_by?: string | null;
					modified_on?: string;
					storage: string;
					tags?: string | null;
					title?: string | null;
					tus_data?: Json | null;
					tus_id?: string | null;
					type?: string | null;
					uploaded_by?: string | null;
					uploaded_on?: string | null;
					width?: number | null;
				};
				Update: {
					charset?: string | null;
					created_on?: string;
					description?: string | null;
					duration?: number | null;
					embed?: string | null;
					filename_disk?: string | null;
					filename_download?: string;
					filesize?: number | null;
					focal_point_x?: number | null;
					focal_point_y?: number | null;
					folder?: string | null;
					height?: number | null;
					id?: string;
					location?: string | null;
					metadata?: Json | null;
					modified_by?: string | null;
					modified_on?: string;
					storage?: string;
					tags?: string | null;
					title?: string | null;
					tus_data?: Json | null;
					tus_id?: string | null;
					type?: string | null;
					uploaded_by?: string | null;
					uploaded_on?: string | null;
					width?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_files_folder_foreign";
						columns: ["folder"];
						isOneToOne: false;
						referencedRelation: "directus_folders";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_files_modified_by_foreign";
						columns: ["modified_by"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_files_uploaded_by_foreign";
						columns: ["uploaded_by"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_flows: {
				Row: {
					accountability: string | null;
					color: string | null;
					date_created: string | null;
					description: string | null;
					icon: string | null;
					id: string;
					name: string;
					operation: string | null;
					options: Json | null;
					status: string;
					trigger: string | null;
					user_created: string | null;
				};
				Insert: {
					accountability?: string | null;
					color?: string | null;
					date_created?: string | null;
					description?: string | null;
					icon?: string | null;
					id: string;
					name: string;
					operation?: string | null;
					options?: Json | null;
					status?: string;
					trigger?: string | null;
					user_created?: string | null;
				};
				Update: {
					accountability?: string | null;
					color?: string | null;
					date_created?: string | null;
					description?: string | null;
					icon?: string | null;
					id?: string;
					name?: string;
					operation?: string | null;
					options?: Json | null;
					status?: string;
					trigger?: string | null;
					user_created?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_flows_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_folders: {
				Row: {
					id: string;
					name: string;
					parent: string | null;
				};
				Insert: {
					id: string;
					name: string;
					parent?: string | null;
				};
				Update: {
					id?: string;
					name?: string;
					parent?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_folders_parent_foreign";
						columns: ["parent"];
						isOneToOne: false;
						referencedRelation: "directus_folders";
						referencedColumns: ["id"];
					},
				];
			};
			directus_migrations: {
				Row: {
					name: string;
					timestamp: string | null;
					version: string;
				};
				Insert: {
					name: string;
					timestamp?: string | null;
					version: string;
				};
				Update: {
					name?: string;
					timestamp?: string | null;
					version?: string;
				};
				Relationships: [];
			};
			directus_notifications: {
				Row: {
					collection: string | null;
					id: number;
					item: string | null;
					message: string | null;
					recipient: string;
					sender: string | null;
					status: string | null;
					subject: string;
					timestamp: string | null;
				};
				Insert: {
					collection?: string | null;
					id?: number;
					item?: string | null;
					message?: string | null;
					recipient: string;
					sender?: string | null;
					status?: string | null;
					subject: string;
					timestamp?: string | null;
				};
				Update: {
					collection?: string | null;
					id?: number;
					item?: string | null;
					message?: string | null;
					recipient?: string;
					sender?: string | null;
					status?: string | null;
					subject?: string;
					timestamp?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_notifications_recipient_foreign";
						columns: ["recipient"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_notifications_sender_foreign";
						columns: ["sender"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_operations: {
				Row: {
					date_created: string | null;
					flow: string;
					id: string;
					key: string;
					name: string | null;
					options: Json | null;
					position_x: number;
					position_y: number;
					reject: string | null;
					resolve: string | null;
					type: string;
					user_created: string | null;
				};
				Insert: {
					date_created?: string | null;
					flow: string;
					id: string;
					key: string;
					name?: string | null;
					options?: Json | null;
					position_x: number;
					position_y: number;
					reject?: string | null;
					resolve?: string | null;
					type: string;
					user_created?: string | null;
				};
				Update: {
					date_created?: string | null;
					flow?: string;
					id?: string;
					key?: string;
					name?: string | null;
					options?: Json | null;
					position_x?: number;
					position_y?: number;
					reject?: string | null;
					resolve?: string | null;
					type?: string;
					user_created?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_operations_flow_foreign";
						columns: ["flow"];
						isOneToOne: false;
						referencedRelation: "directus_flows";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_operations_reject_foreign";
						columns: ["reject"];
						isOneToOne: true;
						referencedRelation: "directus_operations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_operations_resolve_foreign";
						columns: ["resolve"];
						isOneToOne: true;
						referencedRelation: "directus_operations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_operations_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_panels: {
				Row: {
					color: string | null;
					dashboard: string;
					date_created: string | null;
					height: number;
					icon: string | null;
					id: string;
					name: string | null;
					note: string | null;
					options: Json | null;
					position_x: number;
					position_y: number;
					show_header: boolean;
					type: string;
					user_created: string | null;
					width: number;
				};
				Insert: {
					color?: string | null;
					dashboard: string;
					date_created?: string | null;
					height: number;
					icon?: string | null;
					id: string;
					name?: string | null;
					note?: string | null;
					options?: Json | null;
					position_x: number;
					position_y: number;
					show_header?: boolean;
					type: string;
					user_created?: string | null;
					width: number;
				};
				Update: {
					color?: string | null;
					dashboard?: string;
					date_created?: string | null;
					height?: number;
					icon?: string | null;
					id?: string;
					name?: string | null;
					note?: string | null;
					options?: Json | null;
					position_x?: number;
					position_y?: number;
					show_header?: boolean;
					type?: string;
					user_created?: string | null;
					width?: number;
				};
				Relationships: [
					{
						foreignKeyName: "directus_panels_dashboard_foreign";
						columns: ["dashboard"];
						isOneToOne: false;
						referencedRelation: "directus_dashboards";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_panels_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_permissions: {
				Row: {
					action: string;
					collection: string;
					fields: string | null;
					id: number;
					permissions: Json | null;
					policy: string;
					presets: Json | null;
					validation: Json | null;
				};
				Insert: {
					action: string;
					collection: string;
					fields?: string | null;
					id?: number;
					permissions?: Json | null;
					policy: string;
					presets?: Json | null;
					validation?: Json | null;
				};
				Update: {
					action?: string;
					collection?: string;
					fields?: string | null;
					id?: number;
					permissions?: Json | null;
					policy?: string;
					presets?: Json | null;
					validation?: Json | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_permissions_policy_foreign";
						columns: ["policy"];
						isOneToOne: false;
						referencedRelation: "directus_policies";
						referencedColumns: ["id"];
					},
				];
			};
			directus_policies: {
				Row: {
					admin_access: boolean;
					app_access: boolean;
					description: string | null;
					enforce_tfa: boolean;
					icon: string;
					id: string;
					ip_access: string | null;
					name: string;
				};
				Insert: {
					admin_access?: boolean;
					app_access?: boolean;
					description?: string | null;
					enforce_tfa?: boolean;
					icon?: string;
					id: string;
					ip_access?: string | null;
					name: string;
				};
				Update: {
					admin_access?: boolean;
					app_access?: boolean;
					description?: string | null;
					enforce_tfa?: boolean;
					icon?: string;
					id?: string;
					ip_access?: string | null;
					name?: string;
				};
				Relationships: [];
			};
			directus_presets: {
				Row: {
					bookmark: string | null;
					collection: string | null;
					color: string | null;
					filter: Json | null;
					icon: string | null;
					id: number;
					layout: string | null;
					layout_options: Json | null;
					layout_query: Json | null;
					refresh_interval: number | null;
					role: string | null;
					search: string | null;
					user: string | null;
				};
				Insert: {
					bookmark?: string | null;
					collection?: string | null;
					color?: string | null;
					filter?: Json | null;
					icon?: string | null;
					id?: number;
					layout?: string | null;
					layout_options?: Json | null;
					layout_query?: Json | null;
					refresh_interval?: number | null;
					role?: string | null;
					search?: string | null;
					user?: string | null;
				};
				Update: {
					bookmark?: string | null;
					collection?: string | null;
					color?: string | null;
					filter?: Json | null;
					icon?: string | null;
					id?: number;
					layout?: string | null;
					layout_options?: Json | null;
					layout_query?: Json | null;
					refresh_interval?: number | null;
					role?: string | null;
					search?: string | null;
					user?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_presets_role_foreign";
						columns: ["role"];
						isOneToOne: false;
						referencedRelation: "directus_roles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_presets_user_foreign";
						columns: ["user"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_relations: {
				Row: {
					id: number;
					junction_field: string | null;
					many_collection: string;
					many_field: string;
					one_allowed_collections: string | null;
					one_collection: string | null;
					one_collection_field: string | null;
					one_deselect_action: string;
					one_field: string | null;
					sort_field: string | null;
				};
				Insert: {
					id?: number;
					junction_field?: string | null;
					many_collection: string;
					many_field: string;
					one_allowed_collections?: string | null;
					one_collection?: string | null;
					one_collection_field?: string | null;
					one_deselect_action?: string;
					one_field?: string | null;
					sort_field?: string | null;
				};
				Update: {
					id?: number;
					junction_field?: string | null;
					many_collection?: string;
					many_field?: string;
					one_allowed_collections?: string | null;
					one_collection?: string | null;
					one_collection_field?: string | null;
					one_deselect_action?: string;
					one_field?: string | null;
					sort_field?: string | null;
				};
				Relationships: [];
			};
			directus_revisions: {
				Row: {
					activity: number;
					collection: string;
					data: Json | null;
					delta: Json | null;
					id: number;
					item: string;
					parent: number | null;
					version: string | null;
				};
				Insert: {
					activity: number;
					collection: string;
					data?: Json | null;
					delta?: Json | null;
					id?: number;
					item: string;
					parent?: number | null;
					version?: string | null;
				};
				Update: {
					activity?: number;
					collection?: string;
					data?: Json | null;
					delta?: Json | null;
					id?: number;
					item?: string;
					parent?: number | null;
					version?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_revisions_activity_foreign";
						columns: ["activity"];
						isOneToOne: false;
						referencedRelation: "directus_activity";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_revisions_parent_foreign";
						columns: ["parent"];
						isOneToOne: false;
						referencedRelation: "directus_revisions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_revisions_version_foreign";
						columns: ["version"];
						isOneToOne: false;
						referencedRelation: "directus_versions";
						referencedColumns: ["id"];
					},
				];
			};
			directus_roles: {
				Row: {
					description: string | null;
					icon: string;
					id: string;
					name: string;
					parent: string | null;
				};
				Insert: {
					description?: string | null;
					icon?: string;
					id: string;
					name: string;
					parent?: string | null;
				};
				Update: {
					description?: string | null;
					icon?: string;
					id?: string;
					name?: string;
					parent?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_roles_parent_foreign";
						columns: ["parent"];
						isOneToOne: false;
						referencedRelation: "directus_roles";
						referencedColumns: ["id"];
					},
				];
			};
			directus_sessions: {
				Row: {
					expires: string;
					ip: string | null;
					next_token: string | null;
					origin: string | null;
					share: string | null;
					token: string;
					user: string | null;
					user_agent: string | null;
				};
				Insert: {
					expires: string;
					ip?: string | null;
					next_token?: string | null;
					origin?: string | null;
					share?: string | null;
					token: string;
					user?: string | null;
					user_agent?: string | null;
				};
				Update: {
					expires?: string;
					ip?: string | null;
					next_token?: string | null;
					origin?: string | null;
					share?: string | null;
					token?: string;
					user?: string | null;
					user_agent?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_sessions_share_foreign";
						columns: ["share"];
						isOneToOne: false;
						referencedRelation: "directus_shares";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_sessions_user_foreign";
						columns: ["user"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_settings: {
				Row: {
					ai_anthropic_allowed_models: Json | null;
					ai_anthropic_api_key: string | null;
					ai_google_allowed_models: Json | null;
					ai_google_api_key: string | null;
					ai_openai_allowed_models: Json | null;
					ai_openai_api_key: string | null;
					ai_openai_compatible_api_key: string | null;
					ai_openai_compatible_base_url: string | null;
					ai_openai_compatible_headers: Json | null;
					ai_openai_compatible_models: Json | null;
					ai_openai_compatible_name: string | null;
					ai_system_prompt: string | null;
					auth_login_attempts: number | null;
					auth_password_policy: string | null;
					basemaps: Json | null;
					collaborative_editing_enabled: boolean;
					custom_aspect_ratios: Json | null;
					custom_css: string | null;
					default_appearance: string;
					default_language: string;
					default_theme_dark: string | null;
					default_theme_light: string | null;
					id: number;
					mapbox_key: string | null;
					mcp_allow_deletes: boolean;
					mcp_enabled: boolean;
					mcp_prompts_collection: string | null;
					mcp_system_prompt: string | null;
					mcp_system_prompt_enabled: boolean;
					module_bar: Json | null;
					org_name: string | null;
					product_updates: boolean | null;
					project_color: string;
					project_descriptor: string | null;
					project_id: string | null;
					project_logo: string | null;
					project_name: string;
					project_owner: string | null;
					project_status: string | null;
					project_url: string | null;
					project_usage: string | null;
					public_background: string | null;
					public_favicon: string | null;
					public_foreground: string | null;
					public_note: string | null;
					public_registration: boolean;
					public_registration_email_filter: Json | null;
					public_registration_role: string | null;
					public_registration_verify_email: boolean;
					report_bug_url: string | null;
					report_error_url: string | null;
					report_feature_url: string | null;
					storage_asset_presets: Json | null;
					storage_asset_transform: string | null;
					storage_default_folder: string | null;
					theme_dark_overrides: Json | null;
					theme_light_overrides: Json | null;
					visual_editor_urls: Json | null;
				};
				Insert: {
					ai_anthropic_allowed_models?: Json | null;
					ai_anthropic_api_key?: string | null;
					ai_google_allowed_models?: Json | null;
					ai_google_api_key?: string | null;
					ai_openai_allowed_models?: Json | null;
					ai_openai_api_key?: string | null;
					ai_openai_compatible_api_key?: string | null;
					ai_openai_compatible_base_url?: string | null;
					ai_openai_compatible_headers?: Json | null;
					ai_openai_compatible_models?: Json | null;
					ai_openai_compatible_name?: string | null;
					ai_system_prompt?: string | null;
					auth_login_attempts?: number | null;
					auth_password_policy?: string | null;
					basemaps?: Json | null;
					collaborative_editing_enabled?: boolean;
					custom_aspect_ratios?: Json | null;
					custom_css?: string | null;
					default_appearance?: string;
					default_language?: string;
					default_theme_dark?: string | null;
					default_theme_light?: string | null;
					id?: number;
					mapbox_key?: string | null;
					mcp_allow_deletes?: boolean;
					mcp_enabled?: boolean;
					mcp_prompts_collection?: string | null;
					mcp_system_prompt?: string | null;
					mcp_system_prompt_enabled?: boolean;
					module_bar?: Json | null;
					org_name?: string | null;
					product_updates?: boolean | null;
					project_color?: string;
					project_descriptor?: string | null;
					project_id?: string | null;
					project_logo?: string | null;
					project_name?: string;
					project_owner?: string | null;
					project_status?: string | null;
					project_url?: string | null;
					project_usage?: string | null;
					public_background?: string | null;
					public_favicon?: string | null;
					public_foreground?: string | null;
					public_note?: string | null;
					public_registration?: boolean;
					public_registration_email_filter?: Json | null;
					public_registration_role?: string | null;
					public_registration_verify_email?: boolean;
					report_bug_url?: string | null;
					report_error_url?: string | null;
					report_feature_url?: string | null;
					storage_asset_presets?: Json | null;
					storage_asset_transform?: string | null;
					storage_default_folder?: string | null;
					theme_dark_overrides?: Json | null;
					theme_light_overrides?: Json | null;
					visual_editor_urls?: Json | null;
				};
				Update: {
					ai_anthropic_allowed_models?: Json | null;
					ai_anthropic_api_key?: string | null;
					ai_google_allowed_models?: Json | null;
					ai_google_api_key?: string | null;
					ai_openai_allowed_models?: Json | null;
					ai_openai_api_key?: string | null;
					ai_openai_compatible_api_key?: string | null;
					ai_openai_compatible_base_url?: string | null;
					ai_openai_compatible_headers?: Json | null;
					ai_openai_compatible_models?: Json | null;
					ai_openai_compatible_name?: string | null;
					ai_system_prompt?: string | null;
					auth_login_attempts?: number | null;
					auth_password_policy?: string | null;
					basemaps?: Json | null;
					collaborative_editing_enabled?: boolean;
					custom_aspect_ratios?: Json | null;
					custom_css?: string | null;
					default_appearance?: string;
					default_language?: string;
					default_theme_dark?: string | null;
					default_theme_light?: string | null;
					id?: number;
					mapbox_key?: string | null;
					mcp_allow_deletes?: boolean;
					mcp_enabled?: boolean;
					mcp_prompts_collection?: string | null;
					mcp_system_prompt?: string | null;
					mcp_system_prompt_enabled?: boolean;
					module_bar?: Json | null;
					org_name?: string | null;
					product_updates?: boolean | null;
					project_color?: string;
					project_descriptor?: string | null;
					project_id?: string | null;
					project_logo?: string | null;
					project_name?: string;
					project_owner?: string | null;
					project_status?: string | null;
					project_url?: string | null;
					project_usage?: string | null;
					public_background?: string | null;
					public_favicon?: string | null;
					public_foreground?: string | null;
					public_note?: string | null;
					public_registration?: boolean;
					public_registration_email_filter?: Json | null;
					public_registration_role?: string | null;
					public_registration_verify_email?: boolean;
					report_bug_url?: string | null;
					report_error_url?: string | null;
					report_feature_url?: string | null;
					storage_asset_presets?: Json | null;
					storage_asset_transform?: string | null;
					storage_default_folder?: string | null;
					theme_dark_overrides?: Json | null;
					theme_light_overrides?: Json | null;
					visual_editor_urls?: Json | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_settings_project_logo_foreign";
						columns: ["project_logo"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_settings_public_background_foreign";
						columns: ["public_background"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_settings_public_favicon_foreign";
						columns: ["public_favicon"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_settings_public_foreground_foreign";
						columns: ["public_foreground"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_settings_public_registration_role_foreign";
						columns: ["public_registration_role"];
						isOneToOne: false;
						referencedRelation: "directus_roles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_settings_storage_default_folder_foreign";
						columns: ["storage_default_folder"];
						isOneToOne: false;
						referencedRelation: "directus_folders";
						referencedColumns: ["id"];
					},
				];
			};
			directus_shares: {
				Row: {
					collection: string;
					date_created: string | null;
					date_end: string | null;
					date_start: string | null;
					id: string;
					item: string;
					max_uses: number | null;
					name: string | null;
					password: string | null;
					role: string | null;
					times_used: number | null;
					user_created: string | null;
				};
				Insert: {
					collection: string;
					date_created?: string | null;
					date_end?: string | null;
					date_start?: string | null;
					id: string;
					item: string;
					max_uses?: number | null;
					name?: string | null;
					password?: string | null;
					role?: string | null;
					times_used?: number | null;
					user_created?: string | null;
				};
				Update: {
					collection?: string;
					date_created?: string | null;
					date_end?: string | null;
					date_start?: string | null;
					id?: string;
					item?: string;
					max_uses?: number | null;
					name?: string | null;
					password?: string | null;
					role?: string | null;
					times_used?: number | null;
					user_created?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_shares_collection_foreign";
						columns: ["collection"];
						isOneToOne: false;
						referencedRelation: "directus_collections";
						referencedColumns: ["collection"];
					},
					{
						foreignKeyName: "directus_shares_role_foreign";
						columns: ["role"];
						isOneToOne: false;
						referencedRelation: "directus_roles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_shares_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			directus_translations: {
				Row: {
					id: string;
					key: string;
					language: string;
					value: string;
				};
				Insert: {
					id: string;
					key: string;
					language: string;
					value: string;
				};
				Update: {
					id?: string;
					key?: string;
					language?: string;
					value?: string;
				};
				Relationships: [];
			};
			directus_users: {
				Row: {
					appearance: string | null;
					auth_data: Json | null;
					avatar: string | null;
					description: string | null;
					email: string | null;
					email_notifications: boolean | null;
					external_identifier: string | null;
					first_name: string | null;
					id: string;
					language: string | null;
					last_access: string | null;
					last_name: string | null;
					last_page: string | null;
					location: string | null;
					password: string | null;
					provider: string;
					role: string | null;
					status: string;
					tags: Json | null;
					text_direction: string;
					tfa_secret: string | null;
					theme_dark: string | null;
					theme_dark_overrides: Json | null;
					theme_light: string | null;
					theme_light_overrides: Json | null;
					title: string | null;
					token: string | null;
				};
				Insert: {
					appearance?: string | null;
					auth_data?: Json | null;
					avatar?: string | null;
					description?: string | null;
					email?: string | null;
					email_notifications?: boolean | null;
					external_identifier?: string | null;
					first_name?: string | null;
					id: string;
					language?: string | null;
					last_access?: string | null;
					last_name?: string | null;
					last_page?: string | null;
					location?: string | null;
					password?: string | null;
					provider?: string;
					role?: string | null;
					status?: string;
					tags?: Json | null;
					text_direction?: string;
					tfa_secret?: string | null;
					theme_dark?: string | null;
					theme_dark_overrides?: Json | null;
					theme_light?: string | null;
					theme_light_overrides?: Json | null;
					title?: string | null;
					token?: string | null;
				};
				Update: {
					appearance?: string | null;
					auth_data?: Json | null;
					avatar?: string | null;
					description?: string | null;
					email?: string | null;
					email_notifications?: boolean | null;
					external_identifier?: string | null;
					first_name?: string | null;
					id?: string;
					language?: string | null;
					last_access?: string | null;
					last_name?: string | null;
					last_page?: string | null;
					location?: string | null;
					password?: string | null;
					provider?: string;
					role?: string | null;
					status?: string;
					tags?: Json | null;
					text_direction?: string;
					tfa_secret?: string | null;
					theme_dark?: string | null;
					theme_dark_overrides?: Json | null;
					theme_light?: string | null;
					theme_light_overrides?: Json | null;
					title?: string | null;
					token?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_users_role_foreign";
						columns: ["role"];
						isOneToOne: false;
						referencedRelation: "directus_roles";
						referencedColumns: ["id"];
					},
				];
			};
			directus_versions: {
				Row: {
					collection: string;
					date_created: string | null;
					date_updated: string | null;
					delta: Json | null;
					hash: string | null;
					id: string;
					item: string;
					key: string;
					name: string | null;
					user_created: string | null;
					user_updated: string | null;
				};
				Insert: {
					collection: string;
					date_created?: string | null;
					date_updated?: string | null;
					delta?: Json | null;
					hash?: string | null;
					id: string;
					item: string;
					key: string;
					name?: string | null;
					user_created?: string | null;
					user_updated?: string | null;
				};
				Update: {
					collection?: string;
					date_created?: string | null;
					date_updated?: string | null;
					delta?: Json | null;
					hash?: string | null;
					id?: string;
					item?: string;
					key?: string;
					name?: string | null;
					user_created?: string | null;
					user_updated?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "directus_versions_collection_foreign";
						columns: ["collection"];
						isOneToOne: false;
						referencedRelation: "directus_collections";
						referencedColumns: ["collection"];
					},
					{
						foreignKeyName: "directus_versions_user_created_foreign";
						columns: ["user_created"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "directus_versions_user_updated_foreign";
						columns: ["user_updated"];
						isOneToOne: false;
						referencedRelation: "directus_users";
						referencedColumns: ["id"];
					},
				];
			};
			feedback: {
				Row: {
					attendee: string | null;
					comments: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					is_public: boolean | null;
					rating: number | null;
					session: string | null;
					submitted_at: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					attendee?: string | null;
					comments?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_public?: boolean | null;
					rating?: number | null;
					session?: string | null;
					submitted_at?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					attendee?: string | null;
					comments?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					is_public?: boolean | null;
					rating?: number | null;
					session?: string | null;
					submitted_at?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "feedback_attendee_fkey";
						columns: ["attendee"];
						isOneToOne: false;
						referencedRelation: "attendees";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "feedback_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "feedback_session_fkey";
						columns: ["session"];
						isOneToOne: false;
						referencedRelation: "sessions";
						referencedColumns: ["id"];
					},
				];
			};
			finance_items: {
				Row: {
					actual_amount: number | null;
					budget_amount: number | null;
					category: Database["public"]["Enums"]["finance_category_enum"] | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					invoice_file: string | null;
					item_name: string | null;
					item_type: Database["public"]["Enums"]["finance_item_type_enum"] | null;
					notes: string | null;
					payment_status: Database["public"]["Enums"]["payment_status_enum"] | null;
					updated_at: string | null;
					updated_by: string | null;
					vendor_or_source: string | null;
				};
				Insert: {
					actual_amount?: number | null;
					budget_amount?: number | null;
					category?: Database["public"]["Enums"]["finance_category_enum"] | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					invoice_file?: string | null;
					item_name?: string | null;
					item_type?: Database["public"]["Enums"]["finance_item_type_enum"] | null;
					notes?: string | null;
					payment_status?: Database["public"]["Enums"]["payment_status_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
					vendor_or_source?: string | null;
				};
				Update: {
					actual_amount?: number | null;
					budget_amount?: number | null;
					category?: Database["public"]["Enums"]["finance_category_enum"] | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					invoice_file?: string | null;
					item_name?: string | null;
					item_type?: Database["public"]["Enums"]["finance_item_type_enum"] | null;
					notes?: string | null;
					payment_status?: Database["public"]["Enums"]["payment_status_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
					vendor_or_source?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "finance_items_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "finance_items_invoice_file_fkey";
						columns: ["invoice_file"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
				];
			};
			food_plans: {
				Row: {
					breakfast_count: number | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					day_label: string | null;
					dinner_count: number | null;
					id: string;
					jain_count: number | null;
					lunch_count: number | null;
					meal_date: string | null;
					nonveg_count: number | null;
					notes: string | null;
					special_count: number | null;
					tea_count: number | null;
					updated_at: string | null;
					updated_by: string | null;
					veg_count: number | null;
					vegan_count: number | null;
				};
				Insert: {
					breakfast_count?: number | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					day_label?: string | null;
					dinner_count?: number | null;
					id?: string;
					jain_count?: number | null;
					lunch_count?: number | null;
					meal_date?: string | null;
					nonveg_count?: number | null;
					notes?: string | null;
					special_count?: number | null;
					tea_count?: number | null;
					updated_at?: string | null;
					updated_by?: string | null;
					veg_count?: number | null;
					vegan_count?: number | null;
				};
				Update: {
					breakfast_count?: number | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					day_label?: string | null;
					dinner_count?: number | null;
					id?: string;
					jain_count?: number | null;
					lunch_count?: number | null;
					meal_date?: string | null;
					nonveg_count?: number | null;
					notes?: string | null;
					special_count?: number | null;
					tea_count?: number | null;
					updated_at?: string | null;
					updated_by?: string | null;
					veg_count?: number | null;
					vegan_count?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "food_plans_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			helpdesk_issues: {
				Row: {
					assigned_team: string | null;
					attendee: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					id: string;
					issue_code: string | null;
					issue_status: Database["public"]["Enums"]["issue_status_enum"] | null;
					issue_type: Database["public"]["Enums"]["helpdesk_issue_type_enum"] | null;
					notes: string | null;
					priority: Database["public"]["Enums"]["priority_medium_enum"] | null;
					reported_by_name: string | null;
					resolved_at: string | null;
					title: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					assigned_team?: string | null;
					attendee?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					issue_code?: string | null;
					issue_status?: Database["public"]["Enums"]["issue_status_enum"] | null;
					issue_type?: Database["public"]["Enums"]["helpdesk_issue_type_enum"] | null;
					notes?: string | null;
					priority?: Database["public"]["Enums"]["priority_medium_enum"] | null;
					reported_by_name?: string | null;
					resolved_at?: string | null;
					title?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					assigned_team?: string | null;
					attendee?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					issue_code?: string | null;
					issue_status?: Database["public"]["Enums"]["issue_status_enum"] | null;
					issue_type?: Database["public"]["Enums"]["helpdesk_issue_type_enum"] | null;
					notes?: string | null;
					priority?: Database["public"]["Enums"]["priority_medium_enum"] | null;
					reported_by_name?: string | null;
					resolved_at?: string | null;
					title?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "helpdesk_issues_attendee_fkey";
						columns: ["attendee"];
						isOneToOne: false;
						referencedRelation: "attendees";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "helpdesk_issues_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			logistics_items: {
				Row: {
					category: Database["public"]["Enums"]["logistics_category_enum"] | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					issued_quantity: number | null;
					item_name: string | null;
					notes: string | null;
					status_label: Database["public"]["Enums"]["logistics_status_label_enum"] | null;
					total_quantity: number | null;
					updated_at: string | null;
					updated_by: string | null;
					vendor_contact: string | null;
					vendor_name: string | null;
				};
				Insert: {
					category?: Database["public"]["Enums"]["logistics_category_enum"] | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					issued_quantity?: number | null;
					item_name?: string | null;
					notes?: string | null;
					status_label?:
						| Database["public"]["Enums"]["logistics_status_label_enum"]
						| null;
					total_quantity?: number | null;
					updated_at?: string | null;
					updated_by?: string | null;
					vendor_contact?: string | null;
					vendor_name?: string | null;
				};
				Update: {
					category?: Database["public"]["Enums"]["logistics_category_enum"] | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					issued_quantity?: number | null;
					item_name?: string | null;
					notes?: string | null;
					status_label?:
						| Database["public"]["Enums"]["logistics_status_label_enum"]
						| null;
					total_quantity?: number | null;
					updated_at?: string | null;
					updated_by?: string | null;
					vendor_contact?: string | null;
					vendor_name?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "logistics_items_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			meal_scans: {
				Row: {
					attendee: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					id: string;
					meal_date: string | null;
					meal_type: Database["public"]["Enums"]["meal_type_enum"] | null;
					notes: string | null;
					scanned_at: string | null;
					scanned_by: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					attendee?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					meal_date?: string | null;
					meal_type?: Database["public"]["Enums"]["meal_type_enum"] | null;
					notes?: string | null;
					scanned_at?: string | null;
					scanned_by?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					attendee?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					id?: string;
					meal_date?: string | null;
					meal_type?: Database["public"]["Enums"]["meal_type_enum"] | null;
					notes?: string | null;
					scanned_at?: string | null;
					scanned_by?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "meal_scans_attendee_fkey";
						columns: ["attendee"];
						isOneToOne: false;
						referencedRelation: "attendees";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "meal_scans_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			navigation_groups: {
				Row: {
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					group_key: string | null;
					id: string;
					is_enabled: boolean | null;
					label: string | null;
					sort: number | null;
					sort_order: number | null;
					status: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					group_key?: string | null;
					id?: string;
					is_enabled?: boolean | null;
					label?: string | null;
					sort?: number | null;
					sort_order?: number | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					group_key?: string | null;
					id?: string;
					is_enabled?: boolean | null;
					label?: string | null;
					sort?: number | null;
					sort_order?: number | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "navigation_groups_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			navigation_items: {
				Row: {
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					group: string | null;
					icon: string | null;
					id: string;
					is_enabled: boolean | null;
					item_key: string | null;
					label: string | null;
					required_role: string | null;
					route: string | null;
					sort: number | null;
					sort_order: number | null;
					status: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					group?: string | null;
					icon?: string | null;
					id?: string;
					is_enabled?: boolean | null;
					item_key?: string | null;
					label?: string | null;
					required_role?: string | null;
					route?: string | null;
					sort?: number | null;
					sort_order?: number | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					group?: string | null;
					icon?: string | null;
					id?: string;
					is_enabled?: boolean | null;
					item_key?: string | null;
					label?: string | null;
					required_role?: string | null;
					route?: string | null;
					sort?: number | null;
					sort_order?: number | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "navigation_items_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "navigation_items_group_fkey";
						columns: ["group"];
						isOneToOne: false;
						referencedRelation: "navigation_groups";
						referencedColumns: ["id"];
					},
				];
			};
			sessions: {
				Row: {
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					end_time: string | null;
					extra_data: Json | null;
					id: string;
					is_public: boolean | null;
					session_type: Database["public"]["Enums"]["session_type_enum"] | null;
					sort: number | null;
					speaker: string | null;
					start_time: string | null;
					status: string | null;
					status_label: Database["public"]["Enums"]["session_status_enum"] | null;
					title: string | null;
					track: string | null;
					updated_at: string | null;
					updated_by: string | null;
					venue: string | null;
				};
				Insert: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					end_time?: string | null;
					extra_data?: Json | null;
					id?: string;
					is_public?: boolean | null;
					session_type?: Database["public"]["Enums"]["session_type_enum"] | null;
					sort?: number | null;
					speaker?: string | null;
					start_time?: string | null;
					status?: string | null;
					status_label?: Database["public"]["Enums"]["session_status_enum"] | null;
					title?: string | null;
					track?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
					venue?: string | null;
				};
				Update: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					end_time?: string | null;
					extra_data?: Json | null;
					id?: string;
					is_public?: boolean | null;
					session_type?: Database["public"]["Enums"]["session_type_enum"] | null;
					sort?: number | null;
					speaker?: string | null;
					start_time?: string | null;
					status?: string | null;
					status_label?: Database["public"]["Enums"]["session_status_enum"] | null;
					title?: string | null;
					track?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
					venue?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "sessions_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "sessions_speaker_fkey";
						columns: ["speaker"];
						isOneToOne: false;
						referencedRelation: "speakers";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "sessions_track_fkey";
						columns: ["track"];
						isOneToOne: false;
						referencedRelation: "tracks";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "sessions_venue_fkey";
						columns: ["venue"];
						isOneToOne: false;
						referencedRelation: "venues";
						referencedColumns: ["id"];
					},
				];
			};
			speakers: {
				Row: {
					bio: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					designation: string | null;
					email: string | null;
					id: string;
					institution: string | null;
					is_public: boolean | null;
					is_vip: boolean | null;
					name: string | null;
					phone: string | null;
					photo: string | null;
					sort: number | null;
					status: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					bio?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					designation?: string | null;
					email?: string | null;
					id?: string;
					institution?: string | null;
					is_public?: boolean | null;
					is_vip?: boolean | null;
					name?: string | null;
					phone?: string | null;
					photo?: string | null;
					sort?: number | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					bio?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					designation?: string | null;
					email?: string | null;
					id?: string;
					institution?: string | null;
					is_public?: boolean | null;
					is_vip?: boolean | null;
					name?: string | null;
					phone?: string | null;
					photo?: string | null;
					sort?: number | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "speakers_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "speakers_photo_fkey";
						columns: ["photo"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
				];
			};
			sponsors: {
				Row: {
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					id: string;
					is_public: boolean | null;
					logo: string | null;
					name: string | null;
					sort: number | null;
					status: string | null;
					tier: Database["public"]["Enums"]["sponsor_tier_enum"] | null;
					updated_at: string | null;
					updated_by: string | null;
					website: string | null;
				};
				Insert: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					is_public?: boolean | null;
					logo?: string | null;
					name?: string | null;
					sort?: number | null;
					status?: string | null;
					tier?: Database["public"]["Enums"]["sponsor_tier_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
					website?: string | null;
				};
				Update: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					is_public?: boolean | null;
					logo?: string | null;
					name?: string | null;
					sort?: number | null;
					status?: string | null;
					tier?: Database["public"]["Enums"]["sponsor_tier_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
					website?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "sponsors_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "sponsors_logo_fkey";
						columns: ["logo"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
				];
			};
			theme_settings: {
				Row: {
					accent_color: string | null;
					background_color: string | null;
					card_color: string | null;
					conference: string | null;
					config: Json | null;
					created_at: string | null;
					created_by: string | null;
					custom_css: string | null;
					favicon: string | null;
					font_family: string | null;
					id: string;
					logo: string | null;
					primary_color: string | null;
					text_color: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					accent_color?: string | null;
					background_color?: string | null;
					card_color?: string | null;
					conference?: string | null;
					config?: Json | null;
					created_at?: string | null;
					created_by?: string | null;
					custom_css?: string | null;
					favicon?: string | null;
					font_family?: string | null;
					id?: string;
					logo?: string | null;
					primary_color?: string | null;
					text_color?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					accent_color?: string | null;
					background_color?: string | null;
					card_color?: string | null;
					conference?: string | null;
					config?: Json | null;
					created_at?: string | null;
					created_by?: string | null;
					custom_css?: string | null;
					favicon?: string | null;
					font_family?: string | null;
					id?: string;
					logo?: string | null;
					primary_color?: string | null;
					text_color?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "theme_settings_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "theme_settings_favicon_fkey";
						columns: ["favicon"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "theme_settings_logo_fkey";
						columns: ["logo"];
						isOneToOne: false;
						referencedRelation: "directus_files";
						referencedColumns: ["id"];
					},
				];
			};
			tracks: {
				Row: {
					code: string | null;
					color: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					id: string;
					is_public: boolean | null;
					name: string | null;
					sort: number | null;
					status: string | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					code?: string | null;
					color?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					is_public?: boolean | null;
					name?: string | null;
					sort?: number | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					code?: string | null;
					color?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					is_public?: boolean | null;
					name?: string | null;
					sort?: number | null;
					status?: string | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "tracks_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			travel_arrivals: {
				Row: {
					arrival_from: string | null;
					arrival_location: string | null;
					arrival_time: string | null;
					attendee: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					driver_name: string | null;
					driver_phone: string | null;
					id: string;
					notes: string | null;
					pickup_required: boolean | null;
					pickup_status: Database["public"]["Enums"]["pickup_status_enum"] | null;
					travel_mode: Database["public"]["Enums"]["travel_mode_enum"] | null;
					updated_at: string | null;
					updated_by: string | null;
					vehicle: string | null;
				};
				Insert: {
					arrival_from?: string | null;
					arrival_location?: string | null;
					arrival_time?: string | null;
					attendee?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					driver_name?: string | null;
					driver_phone?: string | null;
					id?: string;
					notes?: string | null;
					pickup_required?: boolean | null;
					pickup_status?: Database["public"]["Enums"]["pickup_status_enum"] | null;
					travel_mode?: Database["public"]["Enums"]["travel_mode_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
					vehicle?: string | null;
				};
				Update: {
					arrival_from?: string | null;
					arrival_location?: string | null;
					arrival_time?: string | null;
					attendee?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					driver_name?: string | null;
					driver_phone?: string | null;
					id?: string;
					notes?: string | null;
					pickup_required?: boolean | null;
					pickup_status?: Database["public"]["Enums"]["pickup_status_enum"] | null;
					travel_mode?: Database["public"]["Enums"]["travel_mode_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
					vehicle?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "travel_arrivals_attendee_fkey";
						columns: ["attendee"];
						isOneToOne: false;
						referencedRelation: "attendees";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "travel_arrivals_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			venues: {
				Row: {
					capacity: number | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					has_ac: boolean | null;
					has_mic: boolean | null;
					has_projector: boolean | null;
					id: string;
					is_public: boolean | null;
					location: string | null;
					name: string | null;
					sort: number | null;
					status: string | null;
					status_label: Database["public"]["Enums"]["venue_status_label_enum"] | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					capacity?: number | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					has_ac?: boolean | null;
					has_mic?: boolean | null;
					has_projector?: boolean | null;
					id?: string;
					is_public?: boolean | null;
					location?: string | null;
					name?: string | null;
					sort?: number | null;
					status?: string | null;
					status_label?: Database["public"]["Enums"]["venue_status_label_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					capacity?: number | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					has_ac?: boolean | null;
					has_mic?: boolean | null;
					has_projector?: boolean | null;
					id?: string;
					is_public?: boolean | null;
					location?: string | null;
					name?: string | null;
					sort?: number | null;
					status?: string | null;
					status_label?: Database["public"]["Enums"]["venue_status_label_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "venues_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			vip_checklist: {
				Row: {
					assigned_to: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					due_time: string | null;
					id: string;
					is_done: boolean | null;
					item: string | null;
					priority: Database["public"]["Enums"]["priority_medium_enum"] | null;
					sort: number | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					assigned_to?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					due_time?: string | null;
					id?: string;
					is_done?: boolean | null;
					item?: string | null;
					priority?: Database["public"]["Enums"]["priority_medium_enum"] | null;
					sort?: number | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					assigned_to?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					due_time?: string | null;
					id?: string;
					is_done?: boolean | null;
					item?: string | null;
					priority?: Database["public"]["Enums"]["priority_medium_enum"] | null;
					sort?: number | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "vip_checklist_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			vip_guests: {
				Row: {
					arrival_time: string | null;
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					designation: string | null;
					green_room: string | null;
					id: string;
					institution: string | null;
					name: string | null;
					notes: string | null;
					protocol_level: Database["public"]["Enums"]["protocol_level_enum"] | null;
					security_required: boolean | null;
					sort: number | null;
					speech_required: boolean | null;
					status_label: Database["public"]["Enums"]["vip_status_label_enum"] | null;
					updated_at: string | null;
					updated_by: string | null;
					vehicle: string | null;
				};
				Insert: {
					arrival_time?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					designation?: string | null;
					green_room?: string | null;
					id?: string;
					institution?: string | null;
					name?: string | null;
					notes?: string | null;
					protocol_level?: Database["public"]["Enums"]["protocol_level_enum"] | null;
					security_required?: boolean | null;
					sort?: number | null;
					speech_required?: boolean | null;
					status_label?: Database["public"]["Enums"]["vip_status_label_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
					vehicle?: string | null;
				};
				Update: {
					arrival_time?: string | null;
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					designation?: string | null;
					green_room?: string | null;
					id?: string;
					institution?: string | null;
					name?: string | null;
					notes?: string | null;
					protocol_level?: Database["public"]["Enums"]["protocol_level_enum"] | null;
					security_required?: boolean | null;
					sort?: number | null;
					speech_required?: boolean | null;
					status_label?: Database["public"]["Enums"]["vip_status_label_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
					vehicle?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "vip_guests_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
			volunteers: {
				Row: {
					conference: string | null;
					created_at: string | null;
					created_by: string | null;
					email: string | null;
					id: string;
					location: string | null;
					name: string | null;
					notes: string | null;
					phone: string | null;
					role: string | null;
					shift_end: string | null;
					shift_start: string | null;
					status_label: Database["public"]["Enums"]["volunteer_status_label_enum"] | null;
					team: Database["public"]["Enums"]["volunteer_team_enum"] | null;
					updated_at: string | null;
					updated_by: string | null;
				};
				Insert: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					email?: string | null;
					id?: string;
					location?: string | null;
					name?: string | null;
					notes?: string | null;
					phone?: string | null;
					role?: string | null;
					shift_end?: string | null;
					shift_start?: string | null;
					status_label?:
						| Database["public"]["Enums"]["volunteer_status_label_enum"]
						| null;
					team?: Database["public"]["Enums"]["volunteer_team_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Update: {
					conference?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					email?: string | null;
					id?: string;
					location?: string | null;
					name?: string | null;
					notes?: string | null;
					phone?: string | null;
					role?: string | null;
					shift_end?: string | null;
					shift_start?: string | null;
					status_label?:
						| Database["public"]["Enums"]["volunteer_status_label_enum"]
						| null;
					team?: Database["public"]["Enums"]["volunteer_team_enum"] | null;
					updated_at?: string | null;
					updated_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "volunteers_conference_fkey";
						columns: ["conference"];
						isOneToOne: false;
						referencedRelation: "conferences";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			pg_stat_statements: {
				Row: {
					calls: number | null;
					dbid: unknown;
					jit_deform_count: number | null;
					jit_deform_time: number | null;
					jit_emission_count: number | null;
					jit_emission_time: number | null;
					jit_functions: number | null;
					jit_generation_time: number | null;
					jit_inlining_count: number | null;
					jit_inlining_time: number | null;
					jit_optimization_count: number | null;
					jit_optimization_time: number | null;
					local_blk_read_time: number | null;
					local_blk_write_time: number | null;
					local_blks_dirtied: number | null;
					local_blks_hit: number | null;
					local_blks_read: number | null;
					local_blks_written: number | null;
					max_exec_time: number | null;
					max_plan_time: number | null;
					mean_exec_time: number | null;
					mean_plan_time: number | null;
					min_exec_time: number | null;
					min_plan_time: number | null;
					minmax_stats_since: string | null;
					plans: number | null;
					query: string | null;
					queryid: number | null;
					rows: number | null;
					shared_blk_read_time: number | null;
					shared_blk_write_time: number | null;
					shared_blks_dirtied: number | null;
					shared_blks_hit: number | null;
					shared_blks_read: number | null;
					shared_blks_written: number | null;
					stats_since: string | null;
					stddev_exec_time: number | null;
					stddev_plan_time: number | null;
					temp_blk_read_time: number | null;
					temp_blk_write_time: number | null;
					temp_blks_read: number | null;
					temp_blks_written: number | null;
					toplevel: boolean | null;
					total_exec_time: number | null;
					total_plan_time: number | null;
					userid: unknown;
					wal_bytes: number | null;
					wal_fpi: number | null;
					wal_records: number | null;
				};
				Relationships: [];
			};
			pg_stat_statements_info: {
				Row: {
					dealloc: number | null;
					stats_reset: string | null;
				};
				Relationships: [];
			};
		};
		Functions: {
			add_user_to_conference: {
				Args: { p_conference: string; p_directus_user: string; p_role?: string };
				Returns: {
					assigned_role: string;
					conference: string;
					directus_user: string;
					is_active: boolean;
				}[];
			};
			add_user_to_conference_by_email: {
				Args: { p_conference: string; p_email: string; p_role?: string };
				Returns: {
					assigned_role: string;
					conference: string;
					directus_user: string;
					is_active: boolean;
				}[];
			};
			dearmor: { Args: { "": string }; Returns: string };
			gen_random_uuid: { Args: never; Returns: string };
			gen_salt: { Args: { "": string }; Returns: string };
			lookup_conference_by_short_code: {
				Args: { p_short_code: string };
				Returns: {
					id: string;
				}[];
			};
			pg_stat_statements: {
				Args: { showtext: boolean };
				Returns: Record<string, unknown>[];
			};
			pg_stat_statements_info: { Args: never; Returns: Record<string, unknown> };
			pg_stat_statements_reset: {
				Args: {
					dbid?: unknown;
					minmax_only?: boolean;
					queryid?: number;
					userid?: unknown;
				};
				Returns: string;
			};
			pgp_armor_headers: {
				Args: { "": string };
				Returns: Record<string, unknown>[];
			};
		};
		Enums: {
			allocation_status_enum: "allocated" | "checked_in" | "checked_out" | "cancelled";
			attendee_category_enum:
				| "student"
				| "faculty"
				| "industry"
				| "speaker"
				| "vip"
				| "organizer"
				| "volunteer"
				| "other";
			certificate_type_enum:
				| "participation"
				| "speaker"
				| "volunteer"
				| "organizer"
				| "award";
			checkin_status_enum: "not_checked_in" | "checked_in";
			diet_preference_enum: "vegetarian" | "non_veg" | "vegan" | "jain" | "special" | "none";
			finance_category_enum:
				| "registration"
				| "sponsorship"
				| "accommodation"
				| "food"
				| "transport"
				| "printing"
				| "venue_av"
				| "vip_event"
				| "logistics"
				| "misc";
			finance_item_type_enum: "income" | "expense";
			gender_preference_enum: "male" | "female" | "mixed" | "none";
			helpdesk_issue_type_enum:
				| "transport"
				| "accommodation"
				| "food"
				| "badge"
				| "technical"
				| "lost_item"
				| "medical"
				| "vip"
				| "other";
			issue_status_enum: "open" | "in_progress" | "resolved" | "closed";
			issued_status_enum: "not_issued" | "generated" | "emailed" | "printed";
			logistics_category_enum:
				| "kit"
				| "printing"
				| "av"
				| "transport"
				| "food"
				| "venue"
				| "certificate"
				| "misc";
			logistics_status_label_enum:
				| "pending"
				| "ordered"
				| "received"
				| "issued"
				| "shortage"
				| "cancelled";
			meal_type_enum: "breakfast" | "lunch" | "tea" | "dinner";
			payment_status_enum: "pending" | "partial" | "paid" | "received" | "cancelled";
			pickup_status_enum:
				| "not_required"
				| "scheduled"
				| "en_route"
				| "completed"
				| "delayed"
				| "cancelled";
			priority_medium_enum: "low" | "medium" | "high" | "urgent";
			priority_normal_enum: "low" | "normal" | "high" | "urgent";
			protocol_level_enum: "a_plus" | "a" | "b" | "c" | "none";
			public_status_enum: "draft" | "published" | "archived";
			registration_status_enum: "registered" | "confirmed" | "cancelled" | "waitlisted";
			room_status_label_enum: "available" | "occupied" | "reserved" | "maintenance";
			room_type_enum:
				| "single"
				| "double"
				| "triple"
				| "dormitory"
				| "guest_house"
				| "vip_suite";
			session_status_enum: "upcoming" | "ongoing" | "done" | "cancelled";
			session_type_enum:
				| "keynote"
				| "invited"
				| "panel"
				| "workshop"
				| "poster"
				| "break"
				| "social"
				| "vip";
			sponsor_tier_enum: "title" | "platinum" | "gold" | "silver" | "bronze" | "partner";
			travel_mode_enum: "flight" | "train" | "bus" | "car" | "taxi" | "local" | "unknown";
			venue_status_label_enum: "active" | "inactive" | "issue" | "reserved";
			vip_status_label_enum: "pending" | "confirmed" | "arrived" | "completed" | "cancelled";
			volunteer_status_label_enum: "active" | "inactive" | "on_break" | "completed";
			volunteer_team_enum:
				| "registration"
				| "vip"
				| "technical"
				| "transport"
				| "food"
				| "accommodation"
				| "helpdesk"
				| "programme"
				| "venue"
				| "logistics";
			widget_type_enum:
				| "stat_card"
				| "table"
				| "schedule"
				| "list"
				| "bar_chart"
				| "pie_chart"
				| "progress"
				| "announcement";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {
			allocation_status_enum: ["allocated", "checked_in", "checked_out", "cancelled"],
			attendee_category_enum: [
				"student",
				"faculty",
				"industry",
				"speaker",
				"vip",
				"organizer",
				"volunteer",
				"other",
			],
			certificate_type_enum: ["participation", "speaker", "volunteer", "organizer", "award"],
			checkin_status_enum: ["not_checked_in", "checked_in"],
			diet_preference_enum: ["vegetarian", "non_veg", "vegan", "jain", "special", "none"],
			finance_category_enum: [
				"registration",
				"sponsorship",
				"accommodation",
				"food",
				"transport",
				"printing",
				"venue_av",
				"vip_event",
				"logistics",
				"misc",
			],
			finance_item_type_enum: ["income", "expense"],
			gender_preference_enum: ["male", "female", "mixed", "none"],
			helpdesk_issue_type_enum: [
				"transport",
				"accommodation",
				"food",
				"badge",
				"technical",
				"lost_item",
				"medical",
				"vip",
				"other",
			],
			issue_status_enum: ["open", "in_progress", "resolved", "closed"],
			issued_status_enum: ["not_issued", "generated", "emailed", "printed"],
			logistics_category_enum: [
				"kit",
				"printing",
				"av",
				"transport",
				"food",
				"venue",
				"certificate",
				"misc",
			],
			logistics_status_label_enum: [
				"pending",
				"ordered",
				"received",
				"issued",
				"shortage",
				"cancelled",
			],
			meal_type_enum: ["breakfast", "lunch", "tea", "dinner"],
			payment_status_enum: ["pending", "partial", "paid", "received", "cancelled"],
			pickup_status_enum: [
				"not_required",
				"scheduled",
				"en_route",
				"completed",
				"delayed",
				"cancelled",
			],
			priority_medium_enum: ["low", "medium", "high", "urgent"],
			priority_normal_enum: ["low", "normal", "high", "urgent"],
			protocol_level_enum: ["a_plus", "a", "b", "c", "none"],
			public_status_enum: ["draft", "published", "archived"],
			registration_status_enum: ["registered", "confirmed", "cancelled", "waitlisted"],
			room_status_label_enum: ["available", "occupied", "reserved", "maintenance"],
			room_type_enum: ["single", "double", "triple", "dormitory", "guest_house", "vip_suite"],
			session_status_enum: ["upcoming", "ongoing", "done", "cancelled"],
			session_type_enum: [
				"keynote",
				"invited",
				"panel",
				"workshop",
				"poster",
				"break",
				"social",
				"vip",
			],
			sponsor_tier_enum: ["title", "platinum", "gold", "silver", "bronze", "partner"],
			travel_mode_enum: ["flight", "train", "bus", "car", "taxi", "local", "unknown"],
			venue_status_label_enum: ["active", "inactive", "issue", "reserved"],
			vip_status_label_enum: ["pending", "confirmed", "arrived", "completed", "cancelled"],
			volunteer_status_label_enum: ["active", "inactive", "on_break", "completed"],
			volunteer_team_enum: [
				"registration",
				"vip",
				"technical",
				"transport",
				"food",
				"accommodation",
				"helpdesk",
				"programme",
				"venue",
				"logistics",
			],
			widget_type_enum: [
				"stat_card",
				"table",
				"schedule",
				"list",
				"bar_chart",
				"pie_chart",
				"progress",
				"announcement",
			],
		},
	},
} as const;
