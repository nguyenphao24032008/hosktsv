import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import useSWR from 'swr';
import { Form, Formik, FormikHelpers } from 'formik';
import tw from 'twin.macro';
import useFlash from '@/plugins/useFlash';
import fetchConfig, { ServerConfigResponse } from './fetchConfig';
import updateConfig from './updateConfig';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import FlashMessageRender from '@/components/FlashMessageRender';
import Spinner from '@/components/elements/Spinner';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import Button from '@/components/elements/Button';
import Field from '@/components/elements/Field';
import ConfigFieldItem from './ConfigFieldItem';

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings-icon lucide-settings" css={tw`mr-2`}>
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search" css={tw`mr-2`}>
        <path d="m21 21-4.34-4.34"/>
        <circle cx="11" cy="11" r="8"/>
    </svg>
);

const ToggleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-toggle" css={tw`mr-2`}>
        <rect width="20" height="12" x="2" y="6" rx="6" ry="6"/>
        <circle cx="8" cy="12" r="2"/>
    </svg>
);

const SettingsFilterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings-2" css={tw`mr-2`}>
        <path d="M14 17H5"/>
        <path d="M19 7h-9"/>
        <circle cx="17" cy="17" r="3"/>
        <circle cx="7" cy="7" r="3"/>
    </svg>
);

const GridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-grid" css={tw`mr-2`}>
        <rect width="7" height="7" x="3" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="14" rx="1"/>
        <rect width="7" height="7" x="3" y="14" rx="1"/>
    </svg>
);

export default () => {
    const serverUuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const [filterText, setFilterText] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | 'toggles' | 'settings'>('all');

    const { data, error, mutate } = useSWR<ServerConfigResponse>(
        [serverUuid, '/servercfg'],
        (uuid) => fetchConfig(uuid)
    );
    
    const { clearAndAddHttpError, clearFlashes, addFlash } = useFlash();

    const handleSubmit = (formValues: Record<string, any>, { setSubmitting }: FormikHelpers<any>) => {
        clearFlashes('serverprops:editor');

        const processedData: Record<string, string> = {};

        Object.keys(formValues).forEach((key) => {
            const configItem = data?.items.find((item) => item.name === key);
            if (configItem?.inputType === 'toggle') {
                processedData[key] = formValues[key] ? 'true' : 'false';
            } else {
                processedData[key] = String(formValues[key]);
            }
        });

        updateConfig(serverUuid, processedData)
            .then(() => {
                addFlash({
                    key: 'serverprops:editor',
                    type: 'success',
                    message: 'Server configuration has been updated successfully.',
                });
                mutate();
            })
            .catch((err) => {
                clearAndAddHttpError({ key: 'serverprops:editor', error: err });
            })
            .finally(() => {
                setSubmitting(false);
            });
    };

    const filterItems = (item: any): boolean => {
        if (filterText && !item.name.toLowerCase().includes(filterText.toLowerCase())) {
            return false;
        }
        
        if (activeCategory === 'toggles' && item.inputType !== 'toggle') {
            return false;
        }
        
        if (activeCategory === 'settings' && item.inputType === 'toggle') {
            return false;
        }
        
        return true;
    };

    useEffect(() => {
        if (error) {
            clearAndAddHttpError({ key: 'serverprops:editor', error });
        } else {
            clearFlashes('serverprops:editor');
        }
    }, [error]);

    return (
        <ServerContentBlock title={'Server Properties Editor'}>
            <div css={tw`flex items-center mb-4 text-2xl font-bold`}>
                <SettingsIcon />
                <span>Server Properties Editor</span>
            </div>
            <FlashMessageRender byKey={'serverprops:editor'} css={tw`mb-4`} />
            
            {!data ? (
                <Spinner size={'large'} centered />
            ) : (
                <Formik onSubmit={handleSubmit} initialValues={data.defaults}>
                    {({ isSubmitting, resetForm }) => (
                        <Form>
                            <SpinnerOverlay visible={isSubmitting} />
                            <div css={tw`bg-neutral-700 p-4 rounded-sm mb-2`}>
                                <div css={tw`flex flex-col lg:flex-row gap-4`}>
                                    <div css={tw`flex-1`}>
                                        <label css={tw`flex items-center bg-neutral-800 rounded-sm px-3 py-2`}>
                                            <SearchIcon />
                                            <input
                                                type="text"
                                                name="filter"
                                                placeholder="Search configuration options..."
                                                value={filterText}
                                                onChange={(e) => setFilterText(e.target.value)}
                                                css={tw`bg-transparent border-0 outline-none flex-1 text-neutral-100 placeholder-neutral-400`}
                                            />
                                        </label>
                                    </div>
                                    <div css={tw`flex gap-2 flex-wrap items-center`}>
                                        <Button
                                            type={'button'}
                                            color={activeCategory === 'all' ? 'primary' : 'grey'}
                                            onClick={() => setActiveCategory('all')}
                                            css={tw`flex items-center justify-center`}
                                        >
                                            <GridIcon />
                                            <span>All</span>
                                        </Button>
                                        <Button
                                            type={'button'}
                                            color={activeCategory === 'toggles' ? 'primary' : 'grey'}
                                            onClick={() => setActiveCategory('toggles')}
                                            css={tw`flex items-center justify-center`}
                                        >
                                            <ToggleIcon />
                                            <span>Toggles</span>
                                        </Button>
                                        <Button
                                            type={'button'}
                                            color={activeCategory === 'settings' ? 'primary' : 'grey'}
                                            onClick={() => setActiveCategory('settings')}
                                            css={tw`flex items-center justify-center`}
                                        >
                                            <SettingsFilterIcon />
                                            <span>Settings</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div css={tw`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6`}>
                                {data.items
                                    .filter(filterItems)
                                    .map((item, index) => (
                                        <div key={index}>
                                            <ConfigFieldItem config={item} />
                                        </div>
                                    ))}
                            </div>

                            {data.items.filter(filterItems).length === 0 && (
                                <div css={tw`text-center text-gray-400 py-8`}>
                                    No configuration options match your filter.
                                </div>
                            )}

                            <div css={tw`flex justify-end gap-3 mt-6`}>
                                <Button
                                    type={'button'}
                                    color={'grey'}
                                    onClick={() => resetForm()}
                                    disabled={isSubmitting}
                                >
                                    Reset Changes
                                </Button>
                                <Button
                                    type={'submit'}
                                    disabled={isSubmitting}
                                >
                                    Save Configuration
                                </Button>
                            </div>

                            <div css={tw`text-center mt-8 pt-4 border-t border-neutral-700`}>
                                <a 
                                    href="https://studio.slice.wtf" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    css={tw`text-xs text-neutral-500 hover:text-neutral-400 transition-colors duration-200`}
                                >
                                    © Blue Server Properties Editor
                                </a>
                            </div>
                        </Form>
                    )}
                </Formik>
            )}
        </ServerContentBlock>
    );
};

